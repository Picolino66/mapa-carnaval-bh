
import React, { useState, useEffect, useMemo } from 'react';
import { fetchBloquinhos } from './services/api';
import { generateRoutesFromStart } from './services/routeEngine';
import { Bloquinho, RouteSuggestion, AppState } from './types';
import Map from './components/Map';

const DEFAULT_MIN_GAP_HOURS = 4;

const App: React.FC = () => {
  const [state, setState] = useState<AppState & { isMock: boolean }>({
    allBlocks: [],
    filteredBlocks: [],
    selectedDate: '',
    suggestedRoutes: [],
    minGapHours: DEFAULT_MIN_GAP_HOURS,
    isLoading: true,
    isGeneratingRoutes: false,
    error: null,
    isMock: false,
  });

  const [activeRouteIndex, setActiveRouteIndex] = useState<number | null>(null);
  const [focusedBlockId, setFocusedBlockId] = useState<number | null>(null);
  const [originBlockId, setOriginBlockId] = useState<number | null>(null);
  const [routeInfoMessage, setRouteInfoMessage] = useState<string | null>(null);
  const [expandedBlockId, setExpandedBlockId] = useState<number | null>(null);

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const availableDates = useMemo(() => {
    const today = getTodayString();
    const dates = Array.from(new Set(state.allBlocks.map(b => b.data)))
      .filter(date => date >= today)
      .sort();
    
    if (!dates.includes(today)) {
      dates.unshift(today);
    }
    return dates.sort();
  }, [state.allBlocks]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchBloquinhos();
        const data = result.data;
        const today = getTodayString();
        const firstValidDate = Array.from(new Set(data.map((b: any) => b.data)))
          .filter(d => d >= today)
          .sort()[0] || today;

        setState(prev => ({
          ...prev,
          allBlocks: data,
          selectedDate: firstValidDate,
          isLoading: false,
          isMock: result.isMock
        }));
      } catch (err) {
        setState(prev => ({
          ...prev,
          error: "Erro ao carregar o banco de dados.",
          isLoading: false
        }));
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!state.selectedDate) return;
    const filtered = state.allBlocks.filter(b => b.data === state.selectedDate);
    setState(prev => ({ 
      ...prev, 
      filteredBlocks: filtered,
      suggestedRoutes: [],
    }));
    setActiveRouteIndex(null);
    setFocusedBlockId(null);
    setOriginBlockId(null);
    setRouteInfoMessage(null);
    setExpandedBlockId(null);
  }, [state.selectedDate, state.allBlocks]);

  const handleFocusBlock = (block: Bloquinho) => {
    setFocusedBlockId(block.id);
  };

  const handleMinGapHoursChange = (value: string) => {
    const numericValue = Number(value);
    const nextMinGapHours = Number.isFinite(numericValue)
      ? Math.max(0, Math.floor(numericValue))
      : 0;

    setState(prev => ({
      ...prev,
      minGapHours: nextMinGapHours,
      suggestedRoutes: []
    }));
    setActiveRouteIndex(null);
    setRouteInfoMessage(null);
  };

  const handleGenerateFromBlock = (e: React.MouseEvent, block: Bloquinho) => {
    e.stopPropagation();
    setFocusedBlockId(block.id);
    setOriginBlockId(block.id);
    setActiveRouteIndex(null);
    setRouteInfoMessage(null);
    setExpandedBlockId(block.id);
    
    setState(prev => ({ ...prev, isGeneratingRoutes: true }));

    setTimeout(() => {
      const minGapMinutes = Math.max(0, Math.round(state.minGapHours * 60));
      const hasMinGap = minGapMinutes > 0;
      const minGapLabel = `${state.minGapHours}h`;
      const primaryDescription = hasMinGap
        ? `Circuito otimizado com janelas de ${minGapLabel}.`
        : 'Circuito otimizado sem intervalo mínimo.';
      const fallbackDescription = hasMinGap
        ? `Próximos blocos disponíveis (Intervalo < ${minGapLabel}).`
        : 'Próximos blocos disponíveis.';

      const result = generateRoutesFromStart(block, state.allBlocks, minGapMinutes);
      
      const suggestions: (RouteSuggestion & { isFallback?: boolean })[] = result.routes.map((r, idx) => ({
        title: `Roteiro ${idx + 1}`,
        description: r.isFallback 
          ? fallbackDescription 
          : primaryDescription,
        blockIds: r.blockIds,
        isFallback: r.isFallback
      }));

      // Se não tem rota, manda a real pro usuário
      if (suggestions.length === 0) {
        if (result.nextImmediateBlock) {
          setRouteInfoMessage(`Não conseguimos montar um itinerário completo de 3 blocos. Mas aproveite: o próximo bloco hoje é o ${result.nextImmediateBlock.nome} às ${result.nextImmediateBlock.horario.substring(0, 5)}!`);
        } else {
          setRouteInfoMessage("Fim da linha! Não existem mais blocos programados para hoje após este horário.");
        }
      } else if (suggestions[0].isFallback && hasMinGap) {
         setRouteInfoMessage(`Atenção: Não encontramos blocos com intervalo de ${minGapLabel}, então selecionamos os próximos disponíveis para você não ficar parado!`);
      }

      setState(prev => ({
        ...prev,
        suggestedRoutes: suggestions,
        isGeneratingRoutes: false
      }));
    }, 300);
  };

  const activeRoute = activeRouteIndex !== null ? state.suggestedRoutes[activeRouteIndex] : null;

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-800 font-semibold text-lg">Sincronizando a folia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="bg-purple-700 text-white p-4 shadow-md z-10">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">Mapa do Bloco BH</h1>
              <p className="text-[10px] text-purple-200 font-medium mt-1 uppercase tracking-widest">Trace rotas de 3 blocos</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-purple-800/50 p-2 rounded-lg border border-purple-500/30">
            <label htmlFor="date-select" className="text-xs font-bold uppercase opacity-70">Data:</label>
            <select
              id="date-select"
              value={state.selectedDate}
              onChange={(e) => setState(prev => ({ ...prev, selectedDate: e.target.value }))}
              className="bg-white text-purple-900 rounded px-3 py-1 text-sm font-bold outline-none cursor-pointer hover:bg-purple-50 transition-colors"
            >
              {availableDates.map(date => (
                <option key={date} value={date}>
                  {date === getTodayString() ? `HOJE` : 
                  new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' }).toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col h-1/2 md:h-full overflow-hidden shadow-xl z-[5]">
          <div className="p-4 border-b border-slate-100 bg-white">
            <label htmlFor="min-gap-hours" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Intervalo mínimo (horas)
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="min-gap-hours"
                type="number"
                min={0}
                step={1}
                value={state.minGapHours}
                onChange={(e) => handleMinGapHoursChange(e.target.value)}
                className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">h</span>
            </div>
          </div>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Programação</h2>
            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-full">
              {state.filteredBlocks.length} BLOCOS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {routeInfoMessage && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl animate-in slide-in-from-left-4 duration-300 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-amber-600">ℹ️</span>
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Info Logística</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-tight font-medium">
                  {routeInfoMessage}
                </p>
              </div>
            )}

            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-1 border-b border-slate-100 mb-2">
              Todos os Blocos
            </h3>

            {state.filteredBlocks.length === 0 ? (
              <div className="text-center py-10 opacity-60">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Nada encontrado</p>
              </div>
            ) : (
              state.filteredBlocks.map(block => (
                <div 
                  key={block.id} 
                  onClick={() => handleFocusBlock(block)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all group ${
                    focusedBlockId === block.id
                    ? 'border-purple-300 bg-purple-50 shadow-md'
                    : 'bg-white border-slate-50 hover:border-slate-200 shadow-sm'
                  } ${originBlockId === block.id ? 'ring-2 ring-orange-400 border-orange-200' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h4 className={`font-bold text-sm leading-tight flex-1 ${focusedBlockId === block.id ? 'text-purple-700' : 'text-slate-800'}`}>
                      {block.nome}
                    </h4>
                    <span className="text-[11px] font-black text-purple-600 bg-white px-2 py-0.5 rounded-lg border border-purple-100 shadow-sm">
                      {block.horario.substring(0, 5)}
                    </span>
                  </div>
                  
                  <p className="text-[10px] text-slate-400 font-medium mb-3 truncate">📍 {block.local}</p>
                  
                  <button
                    onClick={(e) => handleGenerateFromBlock(e, block)}
                    disabled={state.isGeneratingRoutes}
                    className={`w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      originBlockId === block.id 
                      ? 'bg-orange-100 text-orange-600 border border-orange-200'
                      : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm group-hover:scale-[1.02]'
                    }`}
                  >
                    {state.isGeneratingRoutes && focusedBlockId === block.id ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>{originBlockId === block.id ? 'PONTO DE PARTIDA' : 'TRAÇAR ROTA'}</>
                    )}
                  </button>

                  {expandedBlockId === block.id && state.suggestedRoutes.length > 0 && (
                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                          Itinerários Sugeridos
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedBlockId(null);
                            setActiveRouteIndex(null);
                            setRouteInfoMessage(null);
                            setState(prev => ({
                              ...prev,
                              suggestedRoutes: []
                            }));
                          }}
                          className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          Ocultar
                        </button>
                      </div>
                      <div className="space-y-3">
                        {state.suggestedRoutes.map((route, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveRouteIndex(activeRouteIndex === idx ? null : idx)}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                              activeRouteIndex === idx 
                              ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-100' 
                              : 'border-slate-100 bg-white hover:border-orange-200 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-black text-orange-600 text-[11px] uppercase">{route.title}</span>
                              {(route as any).isFallback && (
                                 <span className="bg-amber-200 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded">RÁPIDO</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 mb-2 font-medium">{route.description}</p>
                            <div className="flex flex-wrap gap-1 items-center">
                              {route.blockIds.map((bid, i) => (
                                <React.Fragment key={bid}>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded truncate max-w-[85px] font-bold ${i === 0 ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    {state.allBlocks.find(b => b.id === bid)?.nome || 'Bloco'}
                                  </span>
                                  {i < route.blockIds.length - 1 && <span className="text-slate-300 text-[10px]">→</span>}
                                </React.Fragment>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 relative h-1/2 md:h-full">
          <Map 
            blocks={state.filteredBlocks} 
            highlightedRoute={activeRoute}
            focusedBlockId={focusedBlockId}
          />
          
          {activeRoute && (
            <div className="absolute top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white/95 backdrop-blur shadow-2xl p-5 rounded-2xl border border-orange-200 z-[1000] animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center mb-4 border-b border-orange-100 pb-2">
                <div>
                   <h3 className="font-black text-orange-600 text-sm uppercase tracking-tight">Roteiro Ativo</h3>
                   <p className="text-[9px] text-slate-400 font-bold uppercase">Distância total: {(activeRoute as any).totalDist ? (activeRoute as any).totalDist.toFixed(1) + 'km' : 'Calculando...'}</p>
                </div>
                <button onClick={() => setActiveRouteIndex(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center transition-colors">✕</button>
              </div>
              <div className="space-y-4">
                {activeRoute.blockIds.map((bid, i) => {
                  const b = state.allBlocks.find(x => x.id === bid);
                  return (
                    <div key={bid} className="flex gap-3 items-start group cursor-pointer" onClick={() => setFocusedBlockId(bid)}>
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm transition-transform group-hover:scale-110 ${i === 0 ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {i + 1}
                        </div>
                        {i < activeRoute.blockIds.length - 1 && <div className="w-0.5 h-6 bg-orange-100 my-1"></div>}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[11px] font-bold text-slate-800 leading-none truncate group-hover:text-orange-600 transition-colors">{b?.nome}</p>
                        <p className="text-[10px] text-orange-500 font-black mt-1.5">{b?.horario.substring(0, 5)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

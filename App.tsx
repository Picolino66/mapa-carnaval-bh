
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

  const adjustMinGapHours = (delta: number) => {
    const nextValue = Math.max(0, state.minGapHours + delta);
    setState(prev => ({
      ...prev,
      minGapHours: nextValue,
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
      <div className="min-h-screen bg-[#cbb7e4] flex items-center justify-center p-6">
        <div className="rounded-3xl bg-[var(--shell-bg)]/95 border border-white/10 px-8 py-10 text-center shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-[var(--accent)] mx-auto mb-4"></div>
          <p className="text-[11px] text-zinc-300 font-semibold uppercase tracking-[0.35em]">Sincronizando a folia</p>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-[var(--shell-bg)]">
      <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[var(--shell-bg)]">
        <aside className="w-full md:w-[340px] h-1/2 md:h-full panel-dark border-b md:border-b-0 md:border-r border-white/10 flex flex-col min-h-0">
          <div className="px-5 pt-5 pb-4 border-b border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.5em] text-zinc-500">mapa</p>
                <h1 className="text-xl font-display text-white mt-1">Mapa do Bloco BH</h1>
                <p className="text-[11px] text-zinc-400 mt-1">Roteiros inteligentes para a folia</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="panel-soft border border-white/10 rounded-xl px-3 py-2 flex flex-col gap-2">
                <label htmlFor="date-select" className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Data</label>
                <select
                  id="date-select"
                  value={state.selectedDate}
                  onChange={(e) => setState(prev => ({ ...prev, selectedDate: e.target.value }))}
                  className="w-full bg-transparent text-white text-sm font-semibold outline-none cursor-pointer"
                >
                  {availableDates.map(date => (
                    <option key={date} value={date} className="text-slate-900">
                      {date === getTodayString()
                        ? `HOJE`
                        : new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' }).toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="panel-soft border border-white/10 rounded-xl px-3 py-2 flex flex-col gap-2">
                <div>
                  <label htmlFor="min-gap-hours" className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 block">Intervalo</label>
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mt-1">horas</p>
                </div>
                <div className="w-full flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustMinGapHours(-1)}
                    className="w-8 h-8 rounded-full bg-white/10 border border-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
                    aria-label="Diminuir intervalo"
                  >
                    -
                  </button>
                  <input
                    id="min-gap-hours"
                    type="number"
                    min={0}
                    step={1}
                    value={state.minGapHours}
                    onChange={(e) => handleMinGapHoursChange(e.target.value)}
                    className="no-spin flex-1 bg-transparent text-white text-sm font-semibold outline-none text-center"
                  />
                  <button
                    type="button"
                    onClick={() => adjustMinGapHours(1)}
                    className="w-8 h-8 rounded-full bg-white/10 border border-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
                    aria-label="Aumentar intervalo"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.4em]">Programação</h2>
            <span className="bg-white/10 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
              {state.filteredBlocks.length} blocos
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
            {routeInfoMessage && (
              <div className="border border-white/10 bg-white/5 p-4 rounded-2xl animate-in slide-in-from-left-4 duration-300">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent-warning)]">Info logística</span>
                </div>
                <p className="text-[11px] text-zinc-200 leading-tight font-medium">
                  {routeInfoMessage}
                </p>
              </div>
            )}

            <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.35em] py-1 border-b border-white/10 mb-2">
              Todos os blocos
            </h3>

            {state.filteredBlocks.length === 0 ? (
              <div className="text-center py-10 opacity-60">
                <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Nada encontrado</p>
              </div>
            ) : (
              state.filteredBlocks.map(block => (
                <div 
                  key={block.id} 
                  onClick={() => handleFocusBlock(block)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all group ${
                    focusedBlockId === block.id
                      ? 'border-[var(--accent)] bg-white/5 shadow-[0_8px_30px_rgba(120,240,200,0.12)]'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  } ${originBlockId === block.id ? 'ring-2 ring-[var(--accent-warning)]/70 border-[var(--accent-warning)]/60' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h4 className={`font-semibold text-sm leading-tight flex-1 ${focusedBlockId === block.id ? 'text-white' : 'text-zinc-100'}`}>
                      {block.nome}
                    </h4>
                    <span className="text-[11px] font-semibold text-zinc-100 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                      {block.horario.substring(0, 5)}
                    </span>
                  </div>
                  
                  <p className="text-[10px] text-zinc-400 font-medium mb-3 truncate">📍 {block.local}</p>
                  
                  <button
                    onClick={(e) => handleGenerateFromBlock(e, block)}
                    disabled={state.isGeneratingRoutes}
                    className={`w-full py-2 rounded-xl text-[10px] font-semibold uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 ${
                      originBlockId === block.id 
                        ? 'bg-white/10 text-[var(--accent-warning)] border border-white/10'
                        : 'bg-[var(--accent)] text-slate-900 hover:bg-[var(--accent-strong)] shadow-sm group-hover:scale-[1.02]'
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
                        <h3 className="text-[10px] font-semibold text-[var(--accent-warning)] uppercase tracking-widest flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--accent-warning)] animate-pulse"></span>
                          Itinerários sugeridos
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
                          className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          Ocultar
                        </button>
                      </div>
                      <div className="space-y-3">
                        {state.suggestedRoutes.map((route, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveRouteIndex(activeRouteIndex === idx ? null : idx)}
                            className={`w-full text-left p-3 rounded-2xl border transition-all ${
                              activeRouteIndex === idx 
                                ? 'border-[var(--accent-warning)] bg-white/10 ring-4 ring-[var(--accent-warning)]/20' 
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-[var(--accent-warning)] text-[11px] uppercase">{route.title}</span>
                              {(route as any).isFallback && (
                                 <span className="bg-[var(--accent-warning)]/20 text-[var(--accent-warning)] text-[8px] font-semibold px-1.5 py-0.5 rounded">RÁPIDO</span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 mb-2 font-medium">{route.description}</p>
                            <div className="flex flex-wrap gap-1 items-center">
                              {route.blockIds.map((bid, i) => (
                                <React.Fragment key={bid}>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded truncate max-w-[85px] font-semibold ${i === 0 ? 'bg-[var(--accent-warning)] text-slate-900' : 'bg-white/10 text-zinc-200'}`}>
                                    {state.allBlocks.find(b => b.id === bid)?.nome || 'Bloco'}
                                  </span>
                                  {i < route.blockIds.length - 1 && <span className="text-zinc-600 text-[10px]">→</span>}
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
        </aside>

        <div className="flex-1 relative h-1/2 md:h-full p-3 md:p-4 min-h-0">
          <Map 
            blocks={state.filteredBlocks} 
            highlightedRoute={activeRoute}
            focusedBlockId={focusedBlockId}
          />
          
          {activeRoute && (
            <div className="absolute top-6 left-6 right-6 md:left-auto md:right-6 md:w-80 panel-soft shadow-2xl p-5 rounded-2xl border border-white/10 z-[1000] animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <div>
                   <h3 className="font-semibold text-[var(--accent)] text-sm uppercase tracking-tight">Roteiro ativo</h3>
                   <p className="text-[9px] text-zinc-400 font-semibold uppercase">Distância total: {(activeRoute as any).totalDist ? (activeRoute as any).totalDist.toFixed(1) + 'km' : 'Calculando...'}</p>
                </div>
                <button onClick={() => setActiveRouteIndex(null)} className="text-zinc-400 hover:text-white bg-white/10 w-6 h-6 rounded-full flex items-center justify-center transition-colors">✕</button>
              </div>
              <div className="space-y-4">
                {activeRoute.blockIds.map((bid, i) => {
                  const b = state.allBlocks.find(x => x.id === bid);
                  return (
                    <div key={bid} className="flex gap-3 items-start group cursor-pointer" onClick={() => setFocusedBlockId(bid)}>
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold shadow-sm transition-transform group-hover:scale-110 ${i === 0 ? 'bg-[var(--accent)] text-slate-900' : 'bg-white/10 text-zinc-200'}`}>
                          {i + 1}
                        </div>
                        {i < activeRoute.blockIds.length - 1 && <div className="w-0.5 h-6 bg-white/10 my-1"></div>}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[11px] font-semibold text-zinc-100 leading-none truncate group-hover:text-[var(--accent)] transition-colors">{b?.nome}</p>
                        <p className="text-[10px] text-[var(--accent)] font-semibold mt-1.5">{b?.horario.substring(0, 5)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;

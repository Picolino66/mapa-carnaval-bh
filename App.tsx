
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { fetchBloquinhos } from './services/api';
import { generateRoutesFromStart } from './services/routeEngine';
import { Bloquinho, RouteSuggestion, AppState } from './types';
import Map from './components/Map';
import BlockListItem from './components/BlockListItem';
import { useDebounce } from './hooks/useDebounce';

const DEFAULT_MIN_GAP_HOURS = 4;

const App: React.FC = () => {
  const [state, setState] = useState<AppState & { isMock: boolean }>({
    allBlocks: [],
    filteredBlocks: [],
    selectedDate: '',
    suggestedRoutes: [],
    searchQuery: '',
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
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [activeCarouselPage, setActiveCarouselPage] = useState(0);
  const dateMenuMobileRef = useRef<HTMLDivElement | null>(null);
  const dateMenuDesktopRef = useRef<HTMLDivElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const carouselPageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const normalizeQuery = useCallback((value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  , []);

  const formatDateLabel = useCallback((date: string) => {
    if (!date) return 'SELECIONE';
    return date === getTodayString()
      ? 'HOJE'
      : new Date(date + 'T12:00:00')
          .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' })
          .toUpperCase();
  }, []);

  /**
   * Busca otimizada: usa campo searchableText pré-computado
   */
  const matchesSearch = useCallback((block: Bloquinho, query: string) => {
    if (!query) return true;
    return block.searchableText.includes(query);
  }, []);

  const availableDates = useMemo(() => {
    const today = getTodayString();
    const dates = Array.from(new Set(state.allBlocks.map(b => b.data)))
      .filter(date => date >= today);

    if (!dates.includes(today)) {
      dates.unshift(today);
    }
    return dates.sort(); // Apenas 1 sort no final
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

  // Debounce da busca para evitar filtros a cada keystroke
  const debouncedSearchQuery = useDebounce(state.searchQuery, 300);

  // Memoizar query normalizada
  const normalizedQuery = useMemo(
    () => normalizeQuery(debouncedSearchQuery),
    [debouncedSearchQuery, normalizeQuery]
  );

  // Memoizar filteredBlocks para evitar recálculos desnecessários
  const filteredBlocks = useMemo(() => {
    if (!state.selectedDate) return [];
    return state.allBlocks
      .filter(b => b.data === state.selectedDate)
      .filter(b => matchesSearch(b, normalizedQuery));
  }, [state.selectedDate, state.allBlocks, normalizedQuery, matchesSearch]);

  // Atualizar state com filteredBlocks memoizado
  useEffect(() => {
    const availableIds = new Set(filteredBlocks.map(b => b.id));
    const activeOriginStillVisible = originBlockId !== null && availableIds.has(originBlockId);

    setState(prev => ({
      ...prev,
      filteredBlocks,
      suggestedRoutes: activeOriginStillVisible ? prev.suggestedRoutes : [],
    }));

    if (!activeOriginStillVisible) {
      setActiveRouteIndex(null);
      setRouteInfoMessage(null);
      setExpandedBlockId(null);
    }

    if (focusedBlockId !== null && !availableIds.has(focusedBlockId)) {
      setFocusedBlockId(null);
    }
    if (originBlockId !== null && !availableIds.has(originBlockId)) {
      setOriginBlockId(null);
    }
  }, [filteredBlocks, focusedBlockId, originBlockId]);

  const handleOutsideClick = useCallback((event: MouseEvent) => {
    const target = event.target as Node;
    const clickedInsideMobile = dateMenuMobileRef.current?.contains(target);
    const clickedInsideDesktop = dateMenuDesktopRef.current?.contains(target);
    if (!clickedInsideMobile && !clickedInsideDesktop) {
      setIsDateMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!isDateMenuOpen) return;

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDateMenuOpen, handleOutsideClick]);

  // Rastrear página ativa do carrossel mobile via scrollLeft
  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    const updateActivePage = () => {
      const pageWidth = container.clientWidth;
      if (pageWidth === 0) return;
      const page = Math.round(container.scrollLeft / pageWidth);
      setActiveCarouselPage(page);
    };

    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateActivePage);
    };

    // scrollend dispara após scroll-snap terminar
    const handleScrollEnd = () => {
      updateActivePage();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('scrollend', handleScrollEnd, { passive: true });
    updateActivePage();

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('scrollend', handleScrollEnd);
    };
  }, [state.isLoading]);

  const goToCarouselPage = useCallback((pageIndex: number) => {
    const container = carouselRef.current;
    if (!container) return;
    const pageWidth = container.clientWidth || 1;
    container.scrollTo({ left: pageWidth * pageIndex, behavior: 'smooth' });
    setActiveCarouselPage(pageIndex);
  }, []);

  const handleFocusBlock = useCallback((block: Bloquinho) => {
    setFocusedBlockId(block.id);
  }, []);

  const handleMinGapHoursChange = useCallback((value: string) => {
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
  }, []);

  const adjustMinGapHours = useCallback((delta: number) => {
    setState(prev => ({
      ...prev,
      minGapHours: Math.max(0, prev.minGapHours + delta),
      suggestedRoutes: []
    }));
    setActiveRouteIndex(null);
    setRouteInfoMessage(null);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: value,
      suggestedRoutes: []
    }));
    setActiveRouteIndex(null);
    setRouteInfoMessage(null);
    setExpandedBlockId(null);
  }, []);

  const handleGenerateFromBlock = useCallback(async (e: React.MouseEvent, block: Bloquinho) => {
    e.stopPropagation();

    // Agrupar múltiplos setStates em um único
    setFocusedBlockId(block.id);
    setOriginBlockId(block.id);
    setActiveRouteIndex(null);
    setRouteInfoMessage(null);
    setExpandedBlockId(block.id);

    setState(prev => ({
      ...prev,
      isGeneratingRoutes: true,
      searchQuery: ''
    }));

    // Usar requestAnimationFrame para permitir UI atualizar antes do cálculo
    await new Promise(resolve => requestAnimationFrame(resolve));

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
    let infoMessage = null;
    if (suggestions.length === 0) {
      if (result.nextImmediateBlock) {
        infoMessage = `Não conseguimos montar um itinerário completo de 3 blocos. Mas aproveite: o próximo bloco hoje é o ${result.nextImmediateBlock.nome} às ${result.nextImmediateBlock.horario.substring(0, 5)}!`;
      } else {
        infoMessage = "Fim da linha! Não existem mais blocos programados para hoje após este horário.";
      }
    } else if (suggestions[0].isFallback && hasMinGap) {
      infoMessage = `Atenção: Não encontramos blocos com intervalo de ${minGapLabel}, então selecionamos os próximos disponíveis para você não ficar parado!`;
    }

    setRouteInfoMessage(infoMessage);
    setState(prev => ({
      ...prev,
      suggestedRoutes: suggestions,
      isGeneratingRoutes: false
    }));
  }, [state.allBlocks, state.minGapHours]);

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
          {/* Carrossel Mobile */}
          <div className="md:hidden flex-1 flex flex-col min-h-0">
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-display text-white mt-1">Mapa do Bloco BH</h1>
                  <p className="text-[11px] text-zinc-400 mt-1">Roteiros inteligentes para a folia</p>
                </div>
              </div>
            </div>

            <div
              ref={carouselRef}
              className="carousel-container flex-1 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory"
            >
              {/* Página 1: Filtros */}
              <div
                className="carousel-page min-w-full max-w-full flex-shrink-0 snap-start overflow-y-auto overflow-x-hidden custom-scrollbar"
                ref={(el) => { carouselPageRefs.current[0] = el; }}
                data-carousel-index="0"
              >
                <div className="px-5 py-4 space-y-3">
                  <div className="panel-soft border border-white/10 rounded-xl px-3 py-2 flex flex-col gap-2 relative z-[3000]" ref={dateMenuMobileRef}>
                    <label htmlFor="date-select-mobile" className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Data</label>
                    <button
                      id="date-select-mobile"
                      type="button"
                      onClick={() => setIsDateMenuOpen(prev => !prev)}
                      className="w-full bg-transparent text-white text-sm font-semibold outline-none cursor-pointer flex items-center justify-between"
                      aria-haspopup="listbox"
                      aria-expanded={isDateMenuOpen}
                    >
                      <span>{formatDateLabel(state.selectedDate)}</span>
                      <span className="text-xs text-zinc-400">▾</span>
                    </button>
                    {isDateMenuOpen && (
                      <div
                        role="listbox"
                        aria-label="Selecionar data"
                        className="absolute left-0 right-0 top-full mt-2 z-[3000] max-h-56 overflow-auto rounded-lg border border-white/10 bg-[var(--panel-bg)] shadow-lg custom-scrollbar"
                      >
                        {availableDates.map(date => (
                          <button
                            key={date}
                            type="button"
                            role="option"
                            aria-selected={date === state.selectedDate}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setState(prev => ({ ...prev, selectedDate: date }));
                              setIsDateMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm font-semibold transition-colors ${date === state.selectedDate ? 'bg-white/10 text-white' : 'text-zinc-200 hover:bg-white/5'}`}
                          >
                            {formatDateLabel(date)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="panel-soft border border-white/10 rounded-xl px-3 py-2 flex flex-col gap-2">
                    <div>
                      <label htmlFor="min-gap-hours-mobile" className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 block">Intervalo</label>
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
                        id="min-gap-hours-mobile"
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

                  <div className="panel-soft border border-white/10 rounded-xl px-3 py-2 flex flex-col gap-2">
                    <label htmlFor="search-blocks-mobile" className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Pesquisa</label>
                    <input
                      id="search-blocks-mobile"
                      type="text"
                      value={state.searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Rua, bloco ou horário"
                      className="w-full bg-transparent text-white text-sm font-semibold outline-none placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              </div>

              {/* Página 2: Programação */}
              <div
                className="carousel-page min-w-full max-w-full flex-shrink-0 snap-start overflow-y-auto overflow-x-hidden custom-scrollbar"
                ref={(el) => { carouselPageRefs.current[1] = el; }}
                data-carousel-index="1"
              >
                <div className="px-5 py-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.35em]">
                        Todos os blocos
                      </h3>
                      <span className="bg-white/10 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                        {state.filteredBlocks.length} blocos
                      </span>
                    </div>

                    {state.filteredBlocks.length === 0 ? (
                      <div className="text-center py-10 opacity-60">
                        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Nada encontrado</p>
                      </div>
                    ) : (
                      state.filteredBlocks.map(block => (
                        <BlockListItem
                          key={block.id}
                          block={block}
                          isFocused={focusedBlockId === block.id}
                          isOrigin={originBlockId === block.id}
                          isExpanded={expandedBlockId === block.id}
                          isGeneratingRoutes={state.isGeneratingRoutes}
                          suggestedRoutes={state.suggestedRoutes}
                          activeRouteIndex={activeRouteIndex}
                          routeInfoMessage={routeInfoMessage}
                          allBlocks={state.allBlocks}
                          onFocus={handleFocusBlock}
                          onGenerateRoute={handleGenerateFromBlock}
                          onToggleExpand={setExpandedBlockId}
                          onSetActiveRoute={setActiveRouteIndex}
                          onClearRoutes={(e) => {
                            e.stopPropagation();
                            setExpandedBlockId(null);
                            setActiveRouteIndex(null);
                            setRouteInfoMessage(null);
                            setState(prev => ({
                              ...prev,
                              suggestedRoutes: []
                            }));
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Indicadores de página + Hint de swipe */}
            <div className="py-3 border-t border-white/10">
              <div className="flex justify-center gap-2 mb-2">
                <button
                  type="button"
                  className={`carousel-dot ${activeCarouselPage === 0 ? 'active' : ''}`}
                  aria-label="Ir para a página 1"
                  onClick={() => goToCarouselPage(0)}
                />
                <button
                  type="button"
                  className={`carousel-dot ${activeCarouselPage === 1 ? 'active' : ''}`}
                  aria-label="Ir para a página 2"
                  onClick={() => goToCarouselPage(1)}
                />
              </div>
              <p className="text-center text-[10px] text-zinc-300 uppercase tracking-widest">
                ← Deslize para navegar →
              </p>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:block px-5 pt-5 pb-4 border-b border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-display text-white mt-1">Mapa do Bloco BH</h1>
                <p className="text-[11px] text-zinc-400 mt-1">Roteiros inteligentes para a folia</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid">
                <div className="panel-soft border border-white/10 rounded-xl px-3 py-2 flex flex-col gap-2 relative" ref={dateMenuDesktopRef}>
                  <label htmlFor="date-select" className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Data</label>
                  <button
                    id="date-select"
                    type="button"
                    onClick={() => setIsDateMenuOpen(prev => !prev)}
                    className="w-full bg-transparent text-white text-sm font-semibold outline-none cursor-pointer flex items-center justify-between"
                    aria-haspopup="listbox"
                    aria-expanded={isDateMenuOpen}
                  >
                    <span>{formatDateLabel(state.selectedDate)}</span>
                    <span className="text-xs text-zinc-400">▾</span>
                  </button>
                  {isDateMenuOpen && (
                    <div
                      role="listbox"
                      aria-label="Selecionar data"
                      className="absolute left-0 right-0 top-full mt-2 z-30 max-h-56 overflow-auto rounded-lg border border-white/10 bg-[var(--panel-bg)] shadow-lg custom-scrollbar"
                    >
                      {availableDates.map(date => (
                        <button
                          key={date}
                          type="button"
                          role="option"
                          aria-selected={date === state.selectedDate}
                          onClick={() => {
                            setState(prev => ({ ...prev, selectedDate: date }));
                            setIsDateMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm font-semibold transition-colors ${date === state.selectedDate ? 'bg-white/10 text-white' : 'text-zinc-200 hover:bg-white/5'}`}
                        >
                          {formatDateLabel(date)}
                        </button>
                      ))}
                    </div>
                  )}
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

                <div className="panel-soft border border-white/10 rounded-xl px-3 py-2 flex flex-col gap-2">
                  <label htmlFor="search-blocks" className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Pesquisa</label>
                  <input
                    id="search-blocks"
                    type="text"
                    value={state.searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Rua, bloco ou horário"
                    className="w-full bg-transparent text-white text-sm font-semibold outline-none placeholder:text-zinc-600"
                  />
                </div>
              </div>
            </div>

          <div className="hidden md:block px-5 py-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.4em]">Todos os blocos</h2>
              <span className="bg-white/10 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                {state.filteredBlocks.length} blocos
              </span>
            </div>
          </div>

          <div className="hidden md:block flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
            {state.filteredBlocks.length === 0 ? (
              <div className="text-center py-10 opacity-60">
                <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Nada encontrado</p>
              </div>
            ) : (
              state.filteredBlocks.map(block => (
                <BlockListItem
                  key={block.id}
                  block={block}
                  isFocused={focusedBlockId === block.id}
                  isOrigin={originBlockId === block.id}
                  isExpanded={expandedBlockId === block.id}
                  isGeneratingRoutes={state.isGeneratingRoutes}
                  suggestedRoutes={state.suggestedRoutes}
                  activeRouteIndex={activeRouteIndex}
                  routeInfoMessage={routeInfoMessage}
                  allBlocks={state.allBlocks}
                  onFocus={handleFocusBlock}
                  onGenerateRoute={handleGenerateFromBlock}
                  onToggleExpand={setExpandedBlockId}
                  onSetActiveRoute={setActiveRouteIndex}
                  onClearRoutes={(e) => {
                    e.stopPropagation();
                    setExpandedBlockId(null);
                    setActiveRouteIndex(null);
                    setRouteInfoMessage(null);
                    setState(prev => ({
                      ...prev,
                      suggestedRoutes: []
                    }));
                  }}
                />
              ))
            )}
          </div>

          <div className="hidden md:block px-5 py-4 border-t border-white/10">
            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-[0.3em]">
              Desenvolvido por{' '}
              <a
                href="https://www.instagram.com/zaza.py/"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:text-[var(--accent-strong)] transition-colors"
              >
                Isaías
              </a>
            </p>
          </div>

        </aside>

        <div
          className={`flex-1 relative min-h-0 p-3 md:p-4 transition-all duration-300 ease-out md:h-full ${
            activeRoute ? 'h-[65vh] -mt-[calc(40vh-190px)]' : 'h-1/2'
          } md:mt-0`}
        >
          <Map 
            blocks={state.filteredBlocks} 
            highlightedRoute={activeRoute}
            focusedBlockId={focusedBlockId}
          />
          
          {activeRoute && (
            <div className="hidden md:block absolute top-6 left-6 right-6 md:left-auto md:right-6 md:w-80 panel-soft shadow-2xl p-5 rounded-2xl border border-white/10 z-[1000] animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <div>
                   <h3 className="font-semibold text-[var(--accent)] text-sm uppercase tracking-tight">Roteiro ativo</h3>
                </div>
                <button onClick={() => setActiveRouteIndex(null)} className="text-zinc-400 hover:text-white bg-white/10 w-6 h-6 rounded-full flex items-center justify-center transition-colors">✕</button>
              </div>
              <div className="space-y-4">
                {activeRoute.blockIds.map((bid, i) => {
                  const b = state.allBlocks.find(x => x.id === bid);
                  const isActiveStep = focusedBlockId === bid || (focusedBlockId === null && i === 0);
                  return (
                    <div key={bid} className="flex gap-3 items-start group cursor-pointer" onClick={() => setFocusedBlockId(bid)}>
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold shadow-sm transition-transform group-hover:scale-110 ${isActiveStep ? 'bg-[var(--accent)] text-slate-900' : 'bg-white/10 text-zinc-200'}`}>
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
        <div className="px-3 pb-4 text-center md:hidden">
          <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-[0.3em]">
            Desenvolvido por{' '}
            <a
              href="https://www.instagram.com/zaza.py/"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent)] hover:text-[var(--accent-strong)] transition-colors"
            >
              Isaías
            </a>
          </p>
        </div>
      </div>
      {activeRoute && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-[1000] pointer-events-none max-w-full">
          <div className="panel-dark border-b border-white/10 shadow-2xl pointer-events-auto max-w-full overflow-hidden">
            <div className="px-5 py-5 max-w-full">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <div>
                  <h3 className="font-semibold text-[var(--accent)] text-sm uppercase tracking-tight">Roteiro ativo</h3>
                </div>
                <button onClick={() => setActiveRouteIndex(null)} className="text-zinc-200 hover:text-white bg-white/10 w-7 h-7 rounded-full flex items-center justify-center transition-colors">✕</button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1 max-w-full">
                {activeRoute.blockIds.map((bid, i) => {
                  const b = state.allBlocks.find(x => x.id === bid);
                  const isActiveStep = focusedBlockId === bid || (focusedBlockId === null && i === 0);
                  return (
                    <div key={bid} className="flex gap-3 items-start group cursor-pointer max-w-full" onClick={() => setFocusedBlockId(bid)}>
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold shadow-sm transition-transform group-hover:scale-110 ${isActiveStep ? 'bg-[var(--accent)] text-slate-900' : 'bg-white/10 text-zinc-200'}`}>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

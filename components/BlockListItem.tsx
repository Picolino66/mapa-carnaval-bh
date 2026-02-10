import React from 'react';
import { Bloquinho, RouteSuggestion } from '../types';

interface BlockListItemProps {
  block: Bloquinho;
  isFocused: boolean;
  isOrigin: boolean;
  isExpanded: boolean;
  isGeneratingRoutes: boolean;
  suggestedRoutes: RouteSuggestion[];
  activeRouteIndex: number | null;
  routeInfoMessage: string | null;
  allBlocks: Bloquinho[];
  onFocus: (block: Bloquinho) => void;
  onGenerateRoute: (e: React.MouseEvent, block: Bloquinho) => void;
  onToggleExpand: (blockId: number | null) => void;
  onSetActiveRoute: (index: number | null) => void;
  onClearRoutes: (e: React.MouseEvent) => void;
}

/**
 * Componente de item da lista de blocos otimizado com React.memo
 * Só re-renderiza quando props relevantes mudarem
 */
const BlockListItem = React.memo<BlockListItemProps>(({
  block,
  isFocused,
  isOrigin,
  isExpanded,
  isGeneratingRoutes,
  suggestedRoutes,
  activeRouteIndex,
  routeInfoMessage,
  allBlocks,
  onFocus,
  onGenerateRoute,
  onToggleExpand,
  onSetActiveRoute,
  onClearRoutes
}) => {
  return (
    <div
      onClick={() => onFocus(block)}
      className={`w-full max-w-full p-3 rounded-2xl border cursor-pointer transition-all group ${
        isFocused
          ? 'border-[var(--accent)] bg-white/5 shadow-[0_8px_30px_rgba(120,240,200,0.12)]'
          : 'bg-white/5 border-white/10 hover:border-white/20'
      } ${isOrigin ? 'ring-2 ring-[var(--accent-warning)]/70 border-[var(--accent-warning)]/60' : ''}`}
    >
      <div className="flex justify-between items-start mb-1 gap-2 min-w-0">
        <h4 className={`font-semibold text-sm leading-tight flex-1 min-w-0 break-words ${isFocused ? 'text-white' : 'text-zinc-100'}`}>
          {block.nome}
        </h4>
        <span className="text-[11px] font-semibold text-zinc-100 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
          {block.horario.substring(0, 5)}
        </span>
      </div>

      <p className="text-[10px] text-zinc-400 font-medium mb-3 truncate break-words">📍 {block.local}</p>

      <button
        onClick={(e) => onGenerateRoute(e, block)}
        disabled={isGeneratingRoutes}
        className={`w-full py-2 rounded-xl text-[10px] font-semibold uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 ${
          isOrigin
            ? 'bg-white/10 text-[var(--accent-warning)] border border-white/10'
            : 'bg-[var(--accent)] text-slate-900 hover:bg-[var(--accent-strong)] shadow-sm group-hover:scale-[1.02]'
        }`}
      >
        {isGeneratingRoutes && isFocused ? (
          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : (
          <>{isOrigin ? 'PONTO DE PARTIDA' : 'TRAÇAR ROTA'}</>
        )}
      </button>

      {isOrigin && routeInfoMessage && (
        <div className="mt-3 px-3 py-2 rounded-xl border border-white/5 bg-white/5 text-[12px] text-zinc-300 font-medium leading-snug">
          {routeInfoMessage}
        </div>
      )}

      {isExpanded && suggestedRoutes.length > 0 && (
        <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-left-4 duration-300 max-w-full">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-semibold text-[var(--accent-warning)] uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-warning)] animate-pulse"></span>
              Itinerários sugeridos
            </h3>
            <button
              onClick={onClearRoutes}
              className="text-[9px] font-semibold uppercase tracking-widest text-white bg-[var(--accent-warning)]/30 border border-[var(--accent-warning)]/60 px-3 py-1.5 rounded-full hover:bg-[var(--accent-warning)]/50 hover:text-white transition-colors"
            >
              Ocultar
            </button>
          </div>
          <div className="space-y-3 max-w-full">
            {suggestedRoutes.map((route, idx) => (
              <button
                key={`route-${route.blockIds.join('-')}`}
                onClick={() => onSetActiveRoute(activeRouteIndex === idx ? null : idx)}
                className={`w-full max-w-full text-left p-3 rounded-2xl border transition-all ${
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
                <p className="text-[10px] text-zinc-400 mb-2 font-medium break-words">{route.description}</p>
                <div className="flex flex-wrap gap-1 items-center">
                  {route.blockIds.map((bid, i) => (
                    <React.Fragment key={bid}>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded truncate max-w-[85px] font-semibold ${i === 0 ? 'bg-[var(--accent-warning)] text-slate-900' : 'bg-white/10 text-zinc-200'}`}>
                        {allBlocks.find(b => b.id === bid)?.nome || 'Bloco'}
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
  );
}, (prevProps, nextProps) => {
  // Custom comparison: só re-renderiza se props relevantes mudarem
  return (
    prevProps.block.id === nextProps.block.id &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.isOrigin === nextProps.isOrigin &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isGeneratingRoutes === nextProps.isGeneratingRoutes &&
    prevProps.suggestedRoutes === nextProps.suggestedRoutes &&
    prevProps.activeRouteIndex === nextProps.activeRouteIndex &&
    prevProps.routeInfoMessage === nextProps.routeInfoMessage
  );
});

BlockListItem.displayName = 'BlockListItem';

export default BlockListItem;

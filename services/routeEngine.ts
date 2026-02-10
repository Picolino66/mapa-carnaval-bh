
import { Bloquinho } from '../types';

// ========== CACHE DE DISTÂNCIAS ==========
// Armazena distâncias já calculadas para evitar recálculos
const distanceCache = new Map<string, number>();

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcula distância com cache para evitar recálculos
 */
function getCachedDistance(block1: Bloquinho, block2: Bloquinho): number {
  // Usar IDs dos blocos como chave (ordem não importa pois distância é simétrica)
  const key = block1.id < block2.id
    ? `${block1.id}-${block2.id}`
    : `${block2.id}-${block1.id}`;

  if (!distanceCache.has(key)) {
    const dist = haversineKm(block1.lat, block1.lng, block2.lat, block2.lng);
    distanceCache.set(key, dist);
  }

  return distanceCache.get(key)!;
}

/**
 * Limpa o cache de distâncias (útil se dados mudarem)
 */
export function clearDistanceCache(): void {
  distanceCache.clear();
}

export interface CalculatedRoute {
  blockIds: number[];
  totalDist: number;
  isFallback: boolean; // Indica se a rota ignorou a regra de 4h
}

interface ScoredRoute extends CalculatedRoute {
  gapAB: number;
  gapBC: number;
}

export interface RouteResult {
  routes: CalculatedRoute[];
  nextImmediateBlock?: Bloquinho;
}

export function generateRoutesFromStart(
  startBlock: Bloquinho,
  allBlocks: Bloquinho[],
  minGapMinutes: number
): RouteResult {
  const startTime = startBlock.startTime; // Usar campo pré-computado
  const normalizedMinGap = Math.max(0, Math.floor(minGapMinutes));

  const sameDayFutureBlocks = allBlocks
    .filter(b => b.data === startBlock.data && b.id !== startBlock.id)
    .sort((a, b) => a.startTime - b.startTime); // Usar campo pré-computado

  const nextImmediateBlock = sameDayFutureBlocks.find(b => b.startTime > startTime);

  // TENTATIVA 1: Regra principal
  let routes = findRoutes(startBlock, sameDayFutureBlocks, normalizedMinGap, false);

  // TENTATIVA 2: Se não deu, pega os próximos (intervalo zero ou mínimo)
  if (routes.length === 0 && normalizedMinGap > 0) {
    routes = findRoutes(startBlock, sameDayFutureBlocks, normalizedMinGap, true);
  }

  return {
    routes: routes
      .sort((a, b) => {
        if (a.gapAB !== b.gapAB) return a.gapAB - b.gapAB;
        if (a.gapBC !== b.gapBC) return a.gapBC - b.gapBC;
        return a.totalDist - b.totalDist;
      })
      .slice(0, 5)
      .map(route => ({
        blockIds: route.blockIds,
        totalDist: route.totalDist,
        isFallback: route.isFallback
      })),
    nextImmediateBlock
  };
}

function findRoutes(
  startBlock: Bloquinho,
  candidates: Bloquinho[],
  minGap: number,
  isFallback: boolean
): ScoredRoute[] {
  const results: ScoredRoute[] = [];
  const startTime = startBlock.startTime; // Usar campo pré-computado
  const MAX_ROUTES_TO_CONSIDER = 100; // Early exit: limitar busca
  let routesConsidered = 0;

  const computeGap = (prevTime: number, nextTime: number) => {
    const target = prevTime + minGap;
    if (isFallback) {
      return Math.abs(nextTime - target);
    }
    return nextTime - target;
  };

  for (const blockB of candidates) {
    const timeB = blockB.startTime; // Usar campo pré-computado
    if (timeB < startTime) continue;
    if (!isFallback && timeB < startTime + minGap) continue;

    const distAB = getCachedDistance(startBlock, blockB); // Usar cache
    const gapAB = computeGap(startTime, timeB);

    for (const blockC of candidates) {
      if (blockC.id === blockB.id) continue;
      const timeC = blockC.startTime; // Usar campo pré-computado
      if (timeC < timeB) continue;
      if (!isFallback && timeC < timeB + minGap) continue;

      routesConsidered++;

      // Early exit: parar após considerar muitas rotas
      if (routesConsidered >= MAX_ROUTES_TO_CONSIDER) {
        break;
      }

      const distBC = getCachedDistance(blockB, blockC); // Usar cache
      const gapBC = computeGap(timeB, timeC);

      results.push({
        blockIds: [startBlock.id, blockB.id, blockC.id],
        totalDist: distAB + distBC,
        isFallback,
        gapAB,
        gapBC
      });
    }

    // Early exit: sair do loop externo também
    if (routesConsidered >= MAX_ROUTES_TO_CONSIDER) {
      break;
    }
  }

  console.log(`⚡ Consideradas ${routesConsidered} combinações de rotas (otimizado com cache e early exit)`);
  return results;
}


import { Bloquinho } from '../types';

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

function parseTime(timeStr: string): number {
  const [hrs, mins] = timeStr.split(':').map(Number);
  return hrs * 60 + mins;
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
  const startTime = parseTime(startBlock.horario);
  const normalizedMinGap = Math.max(0, Math.floor(minGapMinutes));

  const sameDayFutureBlocks = allBlocks
    .filter(b => b.data === startBlock.data && b.id !== startBlock.id)
    .sort((a, b) => parseTime(a.horario) - parseTime(b.horario));

  const nextImmediateBlock = sameDayFutureBlocks.find(b => parseTime(b.horario) > startTime);

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
  const startTime = parseTime(startBlock.horario);

  const computeGap = (prevTime: number, nextTime: number) => {
    const target = prevTime + minGap;
    if (isFallback) {
      return Math.abs(nextTime - target);
    }
    return nextTime - target;
  };

  for (const blockB of candidates) {
    const timeB = parseTime(blockB.horario);
    if (timeB < startTime) continue;
    if (!isFallback && timeB < startTime + minGap) continue;

    const distAB = haversineKm(
      parseFloat(startBlock.latitude), parseFloat(startBlock.longitude),
      parseFloat(blockB.latitude), parseFloat(blockB.longitude)
    );
    const gapAB = computeGap(startTime, timeB);

    for (const blockC of candidates) {
      if (blockC.id === blockB.id) continue;
      const timeC = parseTime(blockC.horario);
      if (timeC < timeB) continue;
      if (!isFallback && timeC < timeB + minGap) continue;

      const distBC = haversineKm(
        parseFloat(blockB.latitude), parseFloat(blockB.longitude),
        parseFloat(blockC.latitude), parseFloat(blockC.longitude)
      );
      const gapBC = computeGap(timeB, timeC);

      results.push({
        blockIds: [startBlock.id, blockB.id, blockC.id],
        totalDist: distAB + distBC,
        isFallback,
        gapAB,
        gapBC
      });
    }
  }
  return results;
}

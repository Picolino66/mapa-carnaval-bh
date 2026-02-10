import { generateRoutesFromStart, RouteResult } from '../services/routeEngine';
import { Bloquinho } from '../types';

/**
 * Web Worker para geração de rotas
 * Executa cálculos pesados em thread separada para não bloquear UI
 */

interface WorkerMessage {
  block: Bloquinho;
  allBlocks: Bloquinho[];
  minGapMinutes: number;
}

self.addEventListener('message', (e: MessageEvent<WorkerMessage>) => {
  const { block, allBlocks, minGapMinutes } = e.data;

  try {
    const result: RouteResult = generateRoutesFromStart(block, allBlocks, minGapMinutes);
    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar rotas'
    });
  }
});


import { Bloquinho } from '../types';

/**
 * Converte horário "HH:MM" para minutos desde meia-noite
 */
function parseTime(timeStr: string): number {
  const [hrs, mins] = timeStr.split(':').map(Number);
  return hrs * 60 + mins;
}

/**
 * Normaliza texto para busca (lowercase, sem acentos)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Carrega os dados dos bloquinhos a partir do arquivo JSON local.
 * Pré-processa os dados para otimizar performance.
 */
export async function fetchBloquinhos(): Promise<{ data: Bloquinho[], isMock: boolean }> {
  try {
    // Busca o arquivo JSON local que o usuário subiu para o projeto
    const response = await fetch('/mapa-carnaval.json');

    if (!response.ok) {
      throw new Error('Não foi possível carregar o arquivo mapa-carnaval.json');
    }

    const rawData = await response.json();

    // Pré-processar dados: parsear coordenadas e tempos apenas uma vez
    const processedData: Bloquinho[] = rawData
      .map((b: any) => {
        const lat = parseFloat(b.latitude);
        const lng = parseFloat(b.longitude);

        // Validar coordenadas
        if (b.latitude === null || b.longitude === null || isNaN(lat) || isNaN(lng)) {
          return null;
        }

        // Pré-computar campos para otimização
        const startTime = parseTime(b.horario);
        const endTime = b.horario_fim ? parseTime(b.horario_fim) : null;

        // Criar texto searchable único (evita normalização repetida)
        const searchableText = normalizeText([
          b.nome,
          b.local,
          b.endereco,
          b.horario,
          b.horario.substring(0, 5),
          b.horario_fim || ''
        ].join(' '));

        return {
          ...b,
          lat,
          lng,
          startTime,
          endTime,
          searchableText
        } as Bloquinho;
      })
      .filter((b: Bloquinho | null): b is Bloquinho => b !== null);

    console.log(`✅ Carregados ${processedData.length} blocos válidos de ${rawData.length} totais.`);
    console.log(`⚡ Dados pré-processados para máxima performance.`);

    return { data: processedData, isMock: false };
  } catch (error) {
    console.error('Erro ao carregar dados locais:', error);
    throw error;
  }
}

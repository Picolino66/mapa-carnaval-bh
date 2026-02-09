
import { Bloquinho } from '../types';

/**
 * Carrega os dados dos bloquinhos a partir do arquivo JSON local.
 * Isso evita problemas de CORS e utiliza a base de dados completa fornecida.
 */
export async function fetchBloquinhos(): Promise<{ data: Bloquinho[], isMock: boolean }> {
  try {
    // Busca o arquivo JSON local que o usuário subiu para o projeto
    const response = await fetch('/mapa-carnaval.json');

    if (!response.ok) {
      throw new Error('Não foi possível carregar o arquivo mapa-carnaval.json');
    }

    const data = await response.json();
    
    // Filtramos apenas blocos que possuem coordenadas válidas para não quebrar o mapa
    const validData = data.filter((b: Bloquinho) => 
      b.latitude !== null && 
      b.longitude !== null && 
      !isNaN(parseFloat(b.latitude)) && 
      !isNaN(parseFloat(b.longitude))
    );

    console.log(`Carregados ${validData.length} blocos válidos de ${data.length} totais.`);
    
    return { data: validData, isMock: false };
  } catch (error) {
    console.error('Erro ao carregar dados locais:', error);
    throw error;
  }
}

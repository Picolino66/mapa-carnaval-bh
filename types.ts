
export interface Bloquinho {
  id: number;
  oid: string;
  nome: string;
  data: string;
  horario: string;
  horario_fim: string | null;
  local: string;
  endereco: string;
  latitude: string;
  longitude: string;
  categoria_evento: string;
  total_favoritos: number;
}

export interface RouteSuggestion {
  title: string;
  description: string;
  blockIds: number[];
}

export interface AppState {
  allBlocks: Bloquinho[];
  filteredBlocks: Bloquinho[];
  selectedDate: string;
  suggestedRoutes: RouteSuggestion[];
  minGapHours: number;
  isLoading: boolean;
  isGeneratingRoutes: boolean;
  error: string | null;
}

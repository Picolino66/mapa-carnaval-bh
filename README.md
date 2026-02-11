# Mapa do Carnaval BH

Aplicação web para visualizar blocos do Carnaval de Belo Horizonte, filtrar por critérios e gerar rotas entre blocos próximos no tempo.

## Funcionalidades
- Mapa interativo com lista de blocos e detalhes.
- Filtros e busca para encontrar blocos específicos.
- Geração de rotas com intervalo mínimo (em horas) entre blocos.
- Priorização por horário mais próximo do intervalo; em caso de empate, menor distância total.

## Dados e rotas
- Fonte de dados: `public/mapa-carnaval.json`.
- Configuração de rotas: no topo da sidebar esquerda é possível definir o intervalo mínimo (em horas) entre blocos para o cálculo das rotas.

## Requisitos
- Node.js (versão LTS recomendada).

## Comandos
1. Instalar dependências:
   `npm install`
2. Rodar em desenvolvimento:
   `npm run dev`
3. Build de produção:
   `npm run build`
4. Pré-visualizar build:
   `npm run preview`

## Estrutura do projeto
- `App.tsx`: container principal, orquestra carregamento de dados, filtros e rotas.
- `index.tsx`: ponto de entrada da aplicação.
- `index.html`: template do Vite.
- `components/`: UI e mapa (`Map.tsx`, `BlockListItem.tsx`).
- `hooks/`: hooks compartilhados (`useDebounce.ts`).
- `services/`: lógica de dados e rotas (`api.ts`, `routeEngine.ts`).
- `public/`: assets de runtime, incluindo `public/mapa-carnaval.json`.
- `assets/`: assets estáticos.
- `workers/`: código de background/worklets, se usado.
- `dist/`: saída do build do Vite.

## Observações
- Sem framework de testes configurado no momento.

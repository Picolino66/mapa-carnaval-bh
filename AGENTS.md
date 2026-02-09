# Repository Guidelines

## Regras Essenciais
- Idioma: responda sempre em português.
- Antes de qualquer alteração: apresente um plano objetivo (o que será modificado, resultado esperado e impacto) e solicite aprovação do solicitante, após aprovação fazer as alterações.
- Mudanças importantes: atualize o `AGENTS.md` e o `README.md` quando aplicável.

## Project Structure & Module Organization
- `index.html` and `index.tsx` boot the React app via Vite.
- `App.tsx` holds the main UI and orchestration logic.
- `components/` contains React UI modules (e.g., `components/Map.tsx`).
- `services/` contains data and API helpers (e.g., `services/api.ts`).
- `types.ts` defines shared TypeScript types.
- `public/mapa-carnaval.json` is the local data source; `metadata.json` holds app metadata.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the Vite dev server for local development.
- `npm run build`: create a production build in `dist/`.
- `npm run preview`: serve the production build locally to validate output.

## Coding Style & Naming Conventions
- Language: TypeScript + React (ESM).
- Indentation: 2 spaces (match existing files).
- Components use PascalCase file names and exports (`Map.tsx`, `App.tsx`).
- Functions and variables use camelCase (`fetchBloquinhos`).
- No formatter or linter is configured; keep changes small and consistent with surrounding code.

## UI & Theme
- O tema visual principal é escuro com painel lateral; cores e tipografia globais ficam em `index.html`.
- Ajustes de layout devem manter a proporção do painel lateral e o mapa ocupando a área principal.

## Testing Guidelines
- No automated test framework is currently configured.
- Validate changes by running `npm run dev` and manually checking map rendering, route highlighting, and data loading.
- If adding tests later, co-locate them near source (e.g., `components/Map.test.tsx`) and document the runner in this file.

## Commit & Pull Request Guidelines
- No Git history is available in this workspace, so no established commit convention can be inferred.
- Prefer short, descriptive commit messages (e.g., “Add route highlighting for selected blocks”).
- PRs should include a clear summary, testing notes, and screenshots for UI changes. Mention any data updates to `mapa-carnaval.json`.

## Configuration & Secrets
- Do not commit `.env.local` or other secrets.

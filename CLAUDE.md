# CLAUDE.md

- Idioma: responda sempre em português.
- Antes de qualquer alteração: apresente um plano objetivo (o que será modificado, resultado esperado e impacto) e solicite aprovação do solicitante, após aprovação fazer as alterações.
- Mudanças importantes: atualize o `CLAUDE.md` e o `README.md` quando aplicável.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a React + TypeScript + Vite web application for visualizing carnival street party events (bloquinhos) in Belo Horizonte on an interactive map. The app displays events on a Leaflet map, allows users to filter by date, search events, and generates optimized routes between multiple events based on timing constraints.

## Essential Rules

- **Language**: Always respond in Portuguese (pt-BR)
- **Before making changes**: Present an objective plan (what will be modified, expected result, and impact) and request approval from the user
- **Update documentation**: When making significant changes, update this file and README.md as applicable

## Development Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Build for production (outputs to dist/)
npm run preview    # Preview production build locally
```

## Architecture

### Data Flow

1. **Data Source**: `/public/mapa-carnaval.json` contains all carnival event data
2. **Loading**: `services/api.ts` fetches and validates the JSON data (filters out invalid coordinates)
3. **State Management**: `App.tsx` manages all application state using React hooks
4. **Route Calculation**: `services/routeEngine.ts` generates optimized routes between events
5. **Map Rendering**: `components/Map.tsx` renders events and routes using Leaflet

### Key Components

- **App.tsx**: Main orchestration component
  - Manages global state (events, filters, routes, selections)
  - Handles user interactions (date selection, search, route generation)
  - Renders sidebar UI with filters, event list, and route suggestions
  - Mobile responsive with collapsible panels

- **components/Map.tsx**: Leaflet map component
  - Renders event markers with custom icons based on selection state
  - Draws polylines for highlighted routes
  - Handles map initialization and marker lifecycle
  - Uses ResizeObserver for responsive container changes

- **services/routeEngine.ts**: Route optimization logic
  - Calculates distances using Haversine formula
  - Generates route suggestions based on time gaps between events
  - Configurable minimum gap (default 4 hours) between events
  - Falls back to closest events if no routes meet time constraints

- **services/api.ts**: Data loading
  - Fetches from local `/public/mapa-carnaval.json`
  - Validates coordinate data before returning

### Type Definitions (types.ts)

- `Bloquinho`: Event entity with id, name, date, time, location, coordinates, category, favorites
- `RouteSuggestion`: Route with title, description, and array of event IDs
- `AppState`: Global application state structure

### Styling & Theme

- Dark theme with blue/cyan accents
- Global styles defined in `index.html` (no separate CSS files)
- Sidebar inspired by map dashboards with sections for filters, schedule, and routes
- Mobile responsive with collapsible filters and schedule panels
- Leaflet uses CartoDB Dark Matter tile layer

## Route Calculation Logic

The route engine (`services/routeEngine.ts`) prioritizes events with timing closest to the configured minimum gap (default 4 hours). In case of timing ties, it selects routes with the shortest total distance. If no routes satisfy the time constraint, it falls back to showing the nearest events.

## Path Aliasing

The project uses `@/` as an alias for the root directory (configured in both `vite.config.ts` and `tsconfig.json`). However, most imports use relative paths.

## Code Style

- **Language**: TypeScript with ESM modules
- **Indentation**: 2 spaces
- **Naming**:
  - Components: PascalCase files (`Map.tsx`, `App.tsx`)
  - Functions/variables: camelCase (`fetchBloquinhos`, `generateRoutesFromStart`)
- **No linter/formatter configured**: Keep changes consistent with surrounding code

## Mobile Responsiveness

The sidebar includes separate collapsible sections for filters and schedule on mobile devices. State is managed with `isFiltersOpenMobile` and `isScheduleOpenMobile` flags in `App.tsx`.

## Testing

No automated testing framework is configured. Validate changes by:
1. Running `npm run dev`
2. Manually testing map rendering, event filtering, route generation, and mobile layouts
3. Checking browser console for errors

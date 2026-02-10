import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { Bloquinho, RouteSuggestion } from '../types';

interface MapProps {
  blocks: Bloquinho[];
  highlightedRoute: RouteSuggestion | null;
  focusedBlockId: number | null;
}

const Map: React.FC<MapProps> = ({ blocks, highlightedRoute, focusedBlockId }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  // Fix: use globalThis.Map to avoid conflict with the component name 'Map'
  const markersRef = useRef<globalThis.Map<number, L.Marker>>(new globalThis.Map());
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerClusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Inicializa o mapa focado em Belo Horizonte
    mapRef.current = L.map(mapContainerRef.current).setView([-19.919, -43.938], 13);

    // Otimização de tiles: configurações de performance
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
      minZoom: 3,
      updateWhenIdle: true,
      updateInterval: 200,
      keepBuffer: 2,
      crossOrigin: 'anonymous'
    }).addTo(mapRef.current);

    // Inicializar cluster group
    markerClusterGroupRef.current = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      chunkedLoading: true
    });
    mapRef.current.addLayer(markerClusterGroupRef.current);

    // Debounce do ResizeObserver
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    };

    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(mapContainerRef.current);
    } else {
      window.addEventListener('resize', handleResize);
    }

    // Garante recalculo após o primeiro paint (evita tiles faltando)
    requestAnimationFrame(() => {
      mapRef.current?.invalidateSize();
    });

    return () => {
      clearTimeout(resizeTimeout);
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
      if (markerClusterGroupRef.current) {
        markerClusterGroupRef.current.clearLayers();
      }
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Cache de ícones (evita recriação)
  const iconCache = useMemo(() => {
    const cache = new globalThis.Map<string, L.DivIcon>();

    const createIcon = (isHighlighted: boolean) => {
      const cacheKey = isHighlighted ? 'highlighted' : 'normal';

      if (!cache.has(cacheKey)) {
        cache.set(cacheKey, L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div class="flex items-center justify-center w-9 h-9 rounded-full border border-white/20 shadow-xl transition-transform duration-300 ${isHighlighted ? 'bg-[#78f0c8] scale-110' : 'bg-[#1f1f25]'}">
              <div class="flex items-center justify-center w-7 h-7 rounded-full ${isHighlighted ? 'bg-[#111114] text-[#78f0c8]' : 'bg-white/10 text-white'}">
                <span class="text-[11px]">🎊</span>
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        }));
      }

      return cache.get(cacheKey)!;
    };

    return { get: createIcon };
  }, []);

  // IDs de blocos destacados na rota
  const highlightedBlockIds = useMemo(
    () => new Set(highlightedRoute?.blockIds || []),
    [highlightedRoute?.blockIds]
  );

  // Lógica para desenhar marcadores com re-renders inteligentes
  useEffect(() => {
    if (!mapRef.current || !markerClusterGroupRef.current) return;

    const currentBlockIds = new Set(blocks.map(b => b.id));
    const existingMarkerIds = new Set(markersRef.current.keys());

    // 1. Remover apenas markers que não existem mais
    const toRemove = [...existingMarkerIds].filter(id => !currentBlockIds.has(id));
    toRemove.forEach(id => {
      const marker = markersRef.current.get(id);
      if (marker) {
        markerClusterGroupRef.current?.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    // 2. Adicionar apenas novos markers
    const toAdd = blocks.filter(b => !existingMarkerIds.has(b.id));
    toAdd.forEach(block => {
      const lat = block.lat; // Usar campo pré-computado
      const lng = block.lng;

      if (!isNaN(lat) && !isNaN(lng)) {
        const isHighlighted = highlightedBlockIds.has(block.id);

        const marker = L.marker([lat, lng], {
          icon: iconCache.get(isHighlighted)
        });

        // Bindear popup (otimização: conteúdo já está pronto)
        marker.bindPopup(`
          <div class="p-1">
            <h3 class="font-semibold text-sm text-white">${block.nome}</h3>
            <p class="text-xs text-zinc-300"><strong>Horário:</strong> ${block.horario.substring(0, 5)}</p>
            <p class="text-[10px] text-zinc-400">${block.local}</p>
          </div>
        `);

        markerClusterGroupRef.current?.addLayer(marker);
        markersRef.current.set(block.id, marker);
      }
    });

    // 3. Atualizar apenas ícones de markers com highlighting mudado
    existingMarkerIds.forEach(id => {
      if (!toRemove.includes(id)) {
        const marker = markersRef.current.get(id);
        const isHighlighted = highlightedBlockIds.has(id);
        if (marker) {
          marker.setIcon(iconCache.get(isHighlighted));
        }
      }
    });
  }, [blocks, highlightedBlockIds, iconCache]);

  // Separar effect para polylines (evita re-renders desnecessários)
  useEffect(() => {
    if (!mapRef.current) return;

    // Remover polyline antiga
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    // Desenhar nova polyline se rota estiver selecionada
    if (highlightedRoute && highlightedRoute.blockIds.length > 0) {
      // Criar Map para busca O(1)
      const blocksById = new globalThis.Map(blocks.map(b => [b.id, b]));

      const routePoints: [number, number][] = highlightedRoute.blockIds
        .map(id => blocksById.get(id))
        .filter((b): b is Bloquinho => !!b)
        .map(b => [b.lat, b.lng]); // Usar campos pré-computados

      if (routePoints.length > 1) {
        polylineRef.current = L.polyline(routePoints, {
          color: '#78f0c8',
          weight: 4,
          opacity: 0.9,
          dashArray: '6, 8',
          lineJoin: 'round'
        }).addTo(mapRef.current);
      }
    }
  }, [highlightedRoute, blocks]);

  // Separar effect para fitBounds (apenas quando blocks mudam, não quando highlight muda)
  useEffect(() => {
    if (!mapRef.current || focusedBlockId || blocks.length === 0) return;

    const bounds = L.latLngBounds(blocks.map(b => [b.lat, b.lng]));

    try {
      if ((bounds as any).isValid?.()) {
        mapRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15,
          duration: 0.5
        });
      } else {
        // Fallback: centrar em BH
        mapRef.current.setView([-19.919, -43.938], 13, { animate: true });
      }
    } catch (error) {
      console.warn('fitBounds failed:', error);
      mapRef.current.setView([-19.919, -43.938], 13);
    }
  }, [blocks.map(b => b.id).join(','), focusedBlockId]);

  // Lógica de foco individual no bloco
  useEffect(() => {
    if (focusedBlockId && mapRef.current) {
      const marker = markersRef.current.get(focusedBlockId);
      if (marker) {
        const latLng = marker.getLatLng();
        mapRef.current.flyTo(latLng, 16, {
          duration: 1.5
        });
        marker.openPopup();
      }
    }
  }, [focusedBlockId]);

  return <div ref={mapContainerRef} className="w-full h-full rounded-[24px] overflow-hidden shadow-inner border border-white/10" />;
};

export default Map;

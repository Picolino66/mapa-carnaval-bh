import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
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

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Inicializa o mapa focado em Belo Horizonte
    mapRef.current = L.map(mapContainerRef.current).setView([-19.919, -43.938], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(mapRef.current);

    const handleResize = () => {
      mapRef.current?.invalidateSize();
    };

    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(mapContainerRef.current);
    } else {
      window.addEventListener('resize', handleResize);
    }

    // Garante recalculo após o primeiro paint (evita tiles faltando)
    requestAnimationFrame(() => {
      mapRef.current?.invalidateSize();
    });

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Lógica para desenhar marcadores e rotas
  useEffect(() => {
    if (!mapRef.current) return;

    // Limpar marcadores antigos
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const bounds = L.latLngBounds([]);
    let hasMarkers = false;

    // Adicionar marcadores de blocos
    blocks.forEach(block => {
      const lat = parseFloat(block.latitude);
      const lng = parseFloat(block.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        const isHighlightedInRoute = highlightedRoute?.blockIds.includes(block.id);
        
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: `
              <div class="flex items-center justify-center w-9 h-9 rounded-full border border-white/20 shadow-xl transition-transform duration-300 ${isHighlightedInRoute ? 'bg-[#78f0c8] scale-110' : 'bg-[#1f1f25]'}">
                <div class="flex items-center justify-center w-7 h-7 rounded-full ${isHighlightedInRoute ? 'bg-[#111114] text-[#78f0c8]' : 'bg-white/10 text-white'}">
                  <span class="text-[11px]">🎊</span>
                </div>
              </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          })
        })
        .bindPopup(`
          <div class="p-1">
            <h3 class="font-semibold text-sm text-white">${block.nome}</h3>
            <p class="text-xs text-zinc-300"><strong>Horário:</strong> ${block.horario.substring(0, 5)}</p>
            <p class="text-[10px] text-zinc-400">${block.local}</p>
          </div>
        `)
        .addTo(mapRef.current!);
        
        markersRef.current.set(block.id, marker);
        bounds.extend([lat, lng]);
        hasMarkers = true;
      }
    });

    // Desenhar polilinha se uma rota estiver selecionada
    if (highlightedRoute && highlightedRoute.blockIds.length > 0) {
      const routePoints: [number, number][] = highlightedRoute.blockIds
        .map(id => blocks.find(b => b.id === id))
        .filter((b): b is Bloquinho => !!b)
        .map(b => [parseFloat(b.latitude), parseFloat(b.longitude)]);

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

    // Ajustar vista se houver marcadores e NENHUM bloco estiver focado individualmente
    if (hasMarkers && !focusedBlockId) {
      const isValid = (bounds as any).isValid ? (bounds as any).isValid() : true;
      if (isValid) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [blocks, highlightedRoute]);

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

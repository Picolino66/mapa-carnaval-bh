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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current);

    return () => {
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
              <div class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg transition-transform duration-300 ${isHighlightedInRoute ? 'bg-orange-50 scale-125 z-[1000]' : 'bg-purple-600'}">
                <span class="text-white text-[10px] font-bold">🎊</span>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        })
        .bindPopup(`
          <div class="p-1">
            <h3 class="font-bold text-sm text-purple-800">${block.nome}</h3>
            <p class="text-xs"><strong>Horário:</strong> ${block.horario.substring(0, 5)}</p>
            <p class="text-[10px] text-gray-600">${block.local}</p>
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
          color: '#f97316',
          weight: 5,
          opacity: 0.8,
          dashArray: '10, 10',
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

  return <div ref={mapContainerRef} className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-slate-200" />;
};

export default Map;
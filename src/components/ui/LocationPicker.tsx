'use client';

// ============================================
// MERCADITO ONLINE PY - LOCATION PICKER
// Componente de selección de ubicación con Leaflet
// ============================================

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix para iconos de Leaflet en Next.js
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Componente interno para capturar clics en el mapa
function LocationMarker({ 
  position, 
  onChange 
}: { 
  position: [number, number] | null; 
  onChange: (lat: number, lng: number) => void;
}) {
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(position);

  useEffect(() => {
    setMarkerPosition(position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      // Redondear a 6 decimales para consistencia
      const roundedLat = Math.round(lat * 1000000) / 1000000;
      const roundedLng = Math.round(lng * 1000000) / 1000000;
      const newPosition: [number, number] = [roundedLat, roundedLng];
      setMarkerPosition(newPosition);
      console.log('🗺️ LocationMarker click:', { lat: roundedLat, lng: roundedLng });
      // Llamar onChange inmediatamente
      onChange(roundedLat, roundedLng);
    },
  });

  return markerPosition ? <Marker position={markerPosition} icon={icon} /> : null;
}

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onChange: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  height = '400px',
  className = '',
}: LocationPickerProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coordenadas por defecto (Paraguay - Asunción)
  const defaultPosition: [number, number] = [-25.2637, -57.5759];
  const currentPosition: [number, number] | null = 
    latitude !== undefined && longitude !== undefined ? [latitude, longitude] : null;

  if (!isClient) {
    return (
      <div 
        style={{ height }} 
        className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`} style={{ height, width: '100%' }}>
      <MapContainer
        key={`${latitude}-${longitude}`}
        center={currentPosition || defaultPosition}
        zoom={currentPosition ? 17 : 12}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={currentPosition} onChange={onChange} />
      </MapContainer>
    </div>
  );
}


import { MapContainer, TileLayer, CircleMarker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

function RecenterMap({ current }) {
  const map = useMap();
  useEffect(() => {
    if (current) map.panTo([current.lat, current.lon]);
  }, [current]);
  return null;
}

export default function MapView({ panos, current, setCurrent }) {
  const track = panos.map((p) => [p.lat, p.lon]);

  return (
    <MapContainer
      center={[current.lat, current.lon]}
      zoom={18}
      minZoom={14}
      maxZoom={19}
      scrollWheelZoom={true}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxNativeZoom={19}
        maxZoom={19}
      />

      <RecenterMap current={current} />

      {/* Línea del recorrido */}
      {track.length > 1 && (
        <Polyline positions={track} color="#3b82f6" weight={5} opacity={0.7} />
      )}

      {/* Puntos seleccionables — más grandes para facilitar el toque */}
      {panos.map((pano) => (
        <CircleMarker
          key={pano.id}
          center={[pano.lat, pano.lon]}
          radius={pano.id === current.id ? 14 : 10}
          pathOptions={{
            color: pano.id === current.id ? "white" : "#1d4ed8",
            fillColor: pano.id === current.id ? "#ef4444" : "#3b82f6",
            fillOpacity: 1,
            weight: pano.id === current.id ? 3 : 1,
          }}
          eventHandlers={{ click: () => setCurrent(pano) }}
        />
      ))}
    </MapContainer>
  );
}

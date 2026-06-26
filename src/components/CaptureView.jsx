import { useState, useEffect, useRef, useCallback } from "react";
import exifr from "exifr";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const SERVER = "";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const iconFoto = L.divIcon({
  className: "",
  html: `<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const iconPosicion = L.divIcon({
  className: "",
  html: `<div style="background:#ef4444;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.6)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function SeguirPosicion({ pos }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (!pos) return;
    if (first.current) {
      map.setView([pos.lat, pos.lon], 18);
      first.current = false;
    } else {
      map.panTo([pos.lat, pos.lon]);
    }
  }, [pos]);
  return null;
}

export default function CaptureView() {
  const [recording, setRecording] = useState(false);
  const [gpsPoints, setGpsPoints] = useState([]);
  const [posActual, setPosActual] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // GPS en tiempo real
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const p = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          heading: pos.coords.heading,
          accuracy: pos.coords.accuracy,
          timestamp: Date.now(),
        };
        setPosActual(p);
        if (recording) setGpsPoints((prev) => [...prev, p]);
      },
      console.error,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [recording]);

  async function toggleRec() {
    if (!recording) {
      setGpsPoints([]);
      setSaved(false);
      setRecording(true);
    } else {
      setRecording(false);
      if (gpsPoints.length === 0) return;
      setSaving(true);
      try {
        await fetch(`${SERVER}/api/gps_track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gpsPoints),
        });
        setSaved(true);
      } catch (e) {
        console.error("Error guardando GPS", e);
      }
      setSaving(false);
    }
  }

  const handleFoto = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);

    for (const file of files) {
      const form = new FormData();
      form.append("fotos", file);

      let lat = posActual?.lat ?? null;
      let lon = posActual?.lon ?? null;

      try {
        const gps = await exifr.gps(file);
        if (gps) { lat = gps.latitude; lon = gps.longitude; }
      } catch (_) {}

      if (lat) form.append("lat", lat);
      if (lon) form.append("lon", lon);

      try {
        await fetch(`${SERVER}/api/proyectos/default/fotos`, {
          method: "POST",
          body: form,
        });
        const url = URL.createObjectURL(file);
        setPhotos((prev) => [...prev, { url, lat, lon, id: crypto.randomUUID() }]);
      } catch (err) {
        console.error("Error subiendo foto", err);
      }
    }

    setUploading(false);
    e.target.value = "";
  }, [posActual]);

  const track = gpsPoints.map((p) => [p.lat, p.lon]);
  const defaultCenter = posActual
    ? [posActual.lat, posActual.lon]
    : [-34.0967, -59.0293];

  const BOTTOM_BAR = photos.length > 0 ? 140 : 85;

  return (
    <div style={{ width: "100vw", height: "100dvh", display: "flex", flexDirection: "column", background: "black" }}>

      {/* Mapa */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <MapContainer center={defaultCenter} zoom={17} style={{ width: "100%", height: "100%" }} zoomControl={false}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxNativeZoom={19} maxZoom={19}
          />

          <SeguirPosicion pos={posActual} />

          {/* Trazo del recorrido */}
          {track.length > 1 && (
            <Polyline positions={track} color="#ef4444" weight={3} opacity={0.8} />
          )}

          {/* Posición actual */}
          {posActual && (
            <Marker position={[posActual.lat, posActual.lon]} icon={iconPosicion} />
          )}

          {/* Fotos tomadas */}
          {photos.filter(p => p.lat && p.lon).map((p) => (
            <Marker key={p.id} position={[p.lat, p.lon]} icon={iconFoto} />
          ))}
        </MapContainer>

        {/* Info GPS */}
        {posActual && (
          <div style={{
            position: "absolute", top: 10, left: 10, zIndex: 9999,
            background: "rgba(0,0,0,0.75)", color: "white",
            padding: "6px 10px", borderRadius: 8, fontSize: 11
          }}>
            {posActual.lat.toFixed(5)}, {posActual.lon.toFixed(5)}
            <br />
            precisión: {posActual.accuracy?.toFixed(0)}m · {gpsPoints.length} pts
          </div>
        )}
      </div>

      {/* Barra inferior */}
      <div style={{
        background: "#111", padding: "16px 24px",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        borderTop: "1px solid #333", flexShrink: 0
      }}>

        {/* REC */}
        <button onClick={toggleRec} style={{
          background: recording ? "#dc2626" : "#16a34a",
          color: "white", border: "none", borderRadius: 12,
          padding: "14px 24px", fontSize: 16, fontWeight: "bold",
          cursor: "pointer", minWidth: 90
        }}>
          {recording ? "⏹ STOP" : "⏺ REC"}
        </button>

        {/* Estado GPS */}
        <div style={{ color: saving ? "#facc15" : saved ? "#4ade80" : "#666", fontSize: 13, flex: 1 }}>
          {saving ? "Guardando GPS..." : saved ? "✓ GPS guardado" : recording ? `Grabando... ${gpsPoints.length} pts` : ""}
        </div>

        {/* Fotos */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {photos.length > 0 && (
            <span style={{ color: "#60a5fa", fontSize: 13 }}>
              {photos.length} foto{photos.length !== 1 ? "s" : ""}
            </span>
          )}
          <label style={{
            background: uploading ? "#555" : "#2563eb",
            color: "white", border: "none", borderRadius: 12,
            padding: "14px 20px", fontSize: 22,
            cursor: uploading ? "not-allowed" : "pointer"
          }}>
            📷
            <input type="file" accept="image/*" capture="environment"
              onChange={handleFoto} style={{ display: "none" }} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Tira de fotos recientes */}
      {photos.length > 0 && (
        <div style={{
          display: "flex", gap: 6, padding: "6px 12px",
          overflowX: "auto", scrollbarWidth: "none",
          background: "#0a0a0a", flexShrink: 0
        }}>
          {[...photos].reverse().map((p) => (
            <img key={p.id} src={p.url} style={{
              width: 60, height: 45, objectFit: "cover",
              borderRadius: 6, flexShrink: 0,
              border: "2px solid #333"
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

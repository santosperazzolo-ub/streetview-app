import { useState, useCallback, useEffect } from "react";
import exifr from "exifr";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const SERVER = "";
const PROYECTO = "default";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function RecenterMap({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) map.panTo([lat, lon]);
  }, [lat, lon]);
  return null;
}

function getCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
}


function BadgeCalidad({ calidad }) {
  if (!calidad || calidad.aceptable === null) return null;

  return (
    <div style={{
      position: "absolute", top: 10, right: 10,
      background: calidad.aceptable ? "rgba(22,163,74,0.9)" : "rgba(220,38,38,0.9)",
      color: "white", padding: "8px 14px", borderRadius: 10, fontSize: 13,
      fontWeight: "bold", maxWidth: 220,
      boxShadow: "0 2px 8px rgba(0,0,0,0.4)"
    }}>
      {calidad.aceptable
        ? "✓ Aceptable para IA"
        : `✗ No aceptable`}
      <div style={{ fontWeight: "normal", fontSize: 10, marginTop: 4, opacity: 0.8 }}>
        brillo: {calidad.brillo} · nitidez: {calidad.nitidez}
        {calidad.problemas.length > 0 && ` · ${calidad.problemas.join(", ")}`}
      </div>
    </div>
  );
}

export default function PhotosView() {
  const [photos, setPhotos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const mobile = window.innerWidth < 768;

  useEffect(() => {
    fetch(`${SERVER}/api/proyectos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: PROYECTO }),
    }).catch(() => {}).finally(() => {
      fetch(`${SERVER}/api/proyectos/${PROYECTO}/fotos`)
        .then((r) => r.json())
        .then((fotos) => {
          const mapped = fotos.map((f) => ({ ...f, url: `${SERVER}${f.url}` }));
          setPhotos(mapped);
          setSelected(mapped[0] ?? null);
        })
        .catch(() => {});
    });
  }, []);

  const handleFiles = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);

    const deviceGps = await getCurrentPosition();

    for (const file of files) {
      const form = new FormData();
      form.append("fotos", file);

      try {
        const gps = await exifr.gps(file);
        if (!gps && deviceGps) {
          form.append("lat", deviceGps.lat);
          form.append("lon", deviceGps.lon);
        }
      } catch (_) {
        if (deviceGps) {
          form.append("lat", deviceGps.lat);
          form.append("lon", deviceGps.lon);
        }
      }

      try {
        const res = await fetch(`${SERVER}/api/proyectos/${PROYECTO}/fotos`, {
          method: "POST",
          body: form,
        });
        const added = await res.json();
const mapped = added.map((f) => ({ ...f, url: `${SERVER}${f.url}` }));

        // Mostrar alerta si no es aceptable (calidad viene del server)
        for (const f of mapped) {
          if (f.calidad && f.calidad.aceptable === false) {
            const motivo = f.calidad.problemas.join(", ");
            const continuar = window.confirm(
              `⚠️ La foto no es aceptable para IA:\n${motivo}\n\n¿Querés conservarla igual?`
            );
            if (!continuar) {
              await fetch(`${SERVER}/api/proyectos/${PROYECTO}/fotos/${f.id}`, { method: "DELETE" });
              continue;
            }
          }
          setPhotos((prev) => [...prev, f]);
          setSelected(f);
        }
      } catch (err) {
        console.error("Error subiendo foto", err);
      }
    }

    setUploading(false);
    e.target.value = "";
  }, [selected]);

  const eliminarFoto = async (foto) => {
    await fetch(`${SERVER}/api/proyectos/${PROYECTO}/fotos/${foto.id}`, { method: "DELETE" });
    setPhotos((prev) => {
      const next = prev.filter((p) => p.id !== foto.id);
      if (selected?.id === foto.id) setSelected(next[0] ?? null);
      return next;
    });
  };

  const withGps = photos.filter((p) => p.lat && p.lon);
  const defaultCenter = withGps[0] ? [withGps[0].lat, withGps[0].lon] : [-34.0967, -59.0293];

  return (
    <div style={{
      width: "100vw", height: "100dvh",
      display: "flex", flexDirection: mobile ? "column" : "row",
      overflow: "hidden", background: "black", paddingTop: 40
    }}>

      {/* Mapa */}
      <div style={{ width: mobile ? "100%" : "35%", height: mobile ? "35%" : "100%", position: "relative" }}>
        {mobile && (
          <div style={{ position: "absolute", bottom: 10, right: 10, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ background: "#16a34a", color: "white", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontWeight: "bold", fontSize: 15, boxShadow: "0 2px 8px rgba(0,0,0,0.5)", textAlign: "center" }}>
              {uploading ? "Subiendo..." : "📷 Sacar foto"}
              <input type="file" accept="image/*" capture="environment" onChange={handleFiles} style={{ display: "none" }} disabled={uploading} />
            </label>
            <label style={{ background: "#2563eb", color: "white", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontWeight: "bold", fontSize: 15, boxShadow: "0 2px 8px rgba(0,0,0,0.5)", textAlign: "center" }}>
              {uploading ? "Subiendo..." : "+ Galería"}
              <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} disabled={uploading} />
            </label>
          </div>
        )}

        <MapContainer center={defaultCenter} zoom={16} style={{ width: "100%", height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxNativeZoom={19} maxZoom={19} />
          {selected?.lat && selected?.lon && <RecenterMap lat={selected.lat} lon={selected.lon} />}
          {withGps.map((photo) => (
            <Marker
              key={photo.id}
              position={[photo.lat, photo.lon]}
              eventHandlers={{ click: () => setSelected(photo) }}
              opacity={photo.id === selected?.id ? 1 : 0.6}
            />
          ))}
        </MapContainer>
      </div>

      {/* Foto y controles */}
      <div style={{ width: mobile ? "100%" : "65%", height: mobile ? "65%" : "100%", display: "flex", flexDirection: "column", position: "relative", background: "#111" }}>

        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {selected ? (
            <>
              <img src={selected.url} style={{ width: "100%", height: "100%", objectFit: "contain" }} />

              {/* Badge de calidad */}
              <BadgeCalidad calidad={selected.calidad} />

              {!selected.lat && (
                <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.7)", color: "#f87171", padding: "6px 10px", borderRadius: 8, fontSize: 12 }}>
                  Sin GPS en esta foto
                </div>
              )}
              {selected.lat && (
                <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.7)", color: "white", padding: "6px 10px", borderRadius: 8, fontSize: 12 }}>
                  {selected.lat.toFixed(5)}, {selected.lon.toFixed(5)}
                </div>
              )}
              <button onClick={() => eliminarFoto(selected)} style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(180,0,0,0.8)", color: "white", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>
                🗑 Eliminar
              </button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#666", gap: 16 }}>
              <span style={{ fontSize: 48 }}>📷</span>
              <span>Cargá fotos para empezar</span>
            </div>
          )}
        </div>

        {!mobile && (
          <div style={{ padding: "10px 16px", background: "#1a1a1a", display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ background: uploading ? "#555" : "#16a34a", color: "white", padding: "8px 16px", borderRadius: 8, cursor: uploading ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: 14, flexShrink: 0 }}>
              {uploading ? "Subiendo..." : "📷 Sacar foto"}
              <input type="file" accept="image/*" capture="environment" onChange={handleFiles} style={{ display: "none" }} disabled={uploading} />
            </label>
            <label style={{ background: uploading ? "#555" : "white", color: "black", padding: "8px 16px", borderRadius: 8, cursor: uploading ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: 14, flexShrink: 0 }}>
              {uploading ? "Subiendo..." : "+ Galería"}
              <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} disabled={uploading} />
            </label>
            {photos.length > 0 && (
              <span style={{ color: "#888", fontSize: 12 }}>
                {photos.length} foto{photos.length !== 1 ? "s" : ""} · {withGps.length} con GPS
              </span>
            )}
          </div>
        )}

        {photos.length > 0 && (
          <div style={{ display: "flex", gap: 8, padding: "8px 12px", overflowX: "auto", scrollbarWidth: "none", background: "#0a0a0a", flexShrink: 0 }}>
            {photos.map((photo) => (
              <div key={photo.id} onClick={() => setSelected(photo)} style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}>
                <img src={photo.url} style={{ width: mobile ? 70 : 90, height: mobile ? 50 : 60, objectFit: "cover", borderRadius: 6, border: photo.id === selected?.id ? "3px solid red" : "2px solid #444" }} />
                {/* Indicador en thumbnail */}
                {photo.calidad && (
                  <div style={{
                    position: "absolute", bottom: 2, right: 2,
                    width: 10, height: 10, borderRadius: "50%",
                    background: photo.calidad.aceptable ? "#16a34a" : "#dc2626",
                    border: "1.5px solid white"
                  }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

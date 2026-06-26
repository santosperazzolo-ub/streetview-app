import { useEffect, useState } from "react";

export default function GpsRecorder() {
  const [recording, setRecording] = useState(false);
  const [points, setPoints] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!recording) return;
    setSaved(false);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPoints((prev) => [...prev, {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          heading: pos.coords.heading,
          accuracy: pos.coords.accuracy,
          timestamp: Date.now()
        }]);
      },
      console.error,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [recording]);

  async function stopAndSave() {
    setRecording(false);
    if (points.length === 0) return;

    setSaving(true);
    try {
      await fetch("/api/gps_track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(points),
      });
      setSaved(true);
    } catch (e) {
      console.error("Error guardando GPS", e);
    }
    setSaving(false);
  }

  return (
    <div style={{
      position: "absolute", top: 10, right: 10, zIndex: 9999,
      background: "black", color: "white", padding: 10,
      display: "flex", gap: 10, alignItems: "center", borderRadius: 8
    }}>
      <button onClick={() => recording ? stopAndSave() : setRecording(true)} style={{
        background: recording ? "#dc2626" : "#16a34a",
        color: "white", border: "none", borderRadius: 6,
        padding: "6px 14px", cursor: "pointer", fontWeight: "bold"
      }}>
        {recording ? "STOP" : "REC"}
      </button>

      <span style={{ fontSize: 12, color: "#aaa" }}>
        {saving ? "Guardando..." : saved ? "✓ GPS guardado" : `${points.length} pts`}
      </span>
    </div>
  );
}

import { useState } from "react";
import { extractVideoFrames, generateEquirectangularFrame } from "../utils/videoFrameExtractor";

export default function VideoProcessor({ projectId, token, gpsPoints, onComplete }) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [frames, setFrames] = useState([]);
  const [status, setStatus] = useState("");

  const handleExtractFrames = async (videoFile) => {
    if (!videoFile || gpsPoints.length === 0) {
      setStatus("❌ Se requiere video y puntos GPS");
      return;
    }

    setProcessing(true);
    setStatus("📹 Extrayendo frames...");

    try {
      // Extraer frames del video
      const extractedFrames = await extractVideoFrames(videoFile, gpsPoints, (prog) => {
        setProgress(prog.percent);
        setStatus(`📹 Extrayendo frames: ${prog.percent}%`);
      });

      setFrames(extractedFrames);
      setStatus(`✓ ${extractedFrames.length} frames extraídos`);

      // Generar panoramas equirectangulares
      setStatus("🎨 Generando panoramas...");
      const panoramas = [];

      for (let i = 0; i < extractedFrames.length; i++) {
        const frame = extractedFrames[i];
        const equirect = await generateEquirectangularFrame(
          frame.blob,
          frame.gpsPoint.heading
        );
        panoramas.push({
          ...frame,
          equirectBlob: equirect
        });

        setProgress(Math.round(((i + 1) / extractedFrames.length) * 100));
      }

      // Enviar frames al servidor
      setStatus("📤 Subiendo frames...");
      await uploadFramesToServer(projectId, panoramas, token);

      setStatus("✓ Frames procesados y guardados");
      onComplete?.(panoramas);

    } catch (e) {
      setStatus(`❌ Error: ${e.message}`);
      console.error("Frame extraction error:", e);
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return {
    handleExtractFrames,
    processing,
    progress,
    status,
    frames
  };
}

async function uploadFramesToServer(projectId, panoramas, token) {
  for (let i = 0; i < panoramas.length; i++) {
    const frame = panoramas[i];
    const formData = new FormData();
    formData.append("frame", frame.equirectBlob, `frame_${i}.jpg`);
    formData.append("index", frame.index);
    formData.append("lat", frame.gpsPoint.lat);
    formData.append("lon", frame.gpsPoint.lon);
    formData.append("heading", frame.gpsPoint.heading);

    await fetch(`/api/projects/${projectId}/frames`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
  }
}

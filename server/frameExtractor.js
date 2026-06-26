import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Filtrar puntos GPS por distancia mínima (3 metros)
function filterPointsByDistance(points, minDistance = 3) {
  if (!points || points.length === 0) return [];

  const filtered = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const lastPoint = filtered[filtered.length - 1];
    const currentPoint = points[i];

    // Haversine formula para calcular distancia entre coordenadas
    const R = 6371000; // Radio de la Tierra en metros
    const lat1 = (lastPoint.lat * Math.PI) / 180;
    const lat2 = (currentPoint.lat * Math.PI) / 180;
    const dLat = ((currentPoint.lat - lastPoint.lat) * Math.PI) / 180;
    const dLon = ((currentPoint.lon - lastPoint.lon) * Math.PI) / 180;

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    const distance = R * c; // Distancia en metros

    if (distance >= minDistance) {
      filtered.push(currentPoint);
    }
  }

  return filtered;
}

// Extraer frames del video y asociarlos con puntos GPS
export async function extractFramesFromVideo(videoPath, gpsPoints, projectId) {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(__dirname, 'uploads', `project_${projectId}_frames`);
    fs.mkdirSync(outputDir, { recursive: true });

    if (!gpsPoints || gpsPoints.length === 0) {
      return reject(new Error('Sin puntos GPS'));
    }

    // Filtrar puntos GPS por distancia de 3 metros
    const filteredGpsPoints = filterPointsByDistance(gpsPoints, 3);
    console.log(`📍 Puntos GPS filtrados: ${filteredGpsPoints.length} de ${gpsPoints.length} (distancia mínima 3m)`);

    try {
      // Limpiar frames anteriores
      if (fs.existsSync(outputDir)) {
        fs.readdirSync(outputDir).forEach(f => {
          fs.unlinkSync(path.join(outputDir, f));
        });
      }

      // Calcular FPS para extraer N frames
      // Usamos fps=1 para extraer 1 frame por segundo, luego seleccionamos los que necesitamos
      const cmd = [
        'ffmpeg',
        '-i', videoPath,
        '-vf', 'fps=1',
        path.join(outputDir, 'frame_%04d.jpg'),
        '-y'
      ];

      console.log(`⏳ Procesando con FFmpeg...`);
      execSync(cmd.join(' '), {
        stdio: 'pipe',
        shell: '/bin/bash'
      });

      // Verificar frames extraídos
      let files = fs.readdirSync(outputDir).filter(f => f.endsWith('.jpg')).sort();

      console.log(`📹 Se extrajeron ${files.length} frames totales`);

      // Asociar frames con puntos GPS filtrados uniformemente
      const frames = [];
      const numGpsPoints = filteredGpsPoints.length;

      if (numGpsPoints === 0) {
        return reject(new Error('Sin puntos GPS después de filtrar por distancia'));
      }

      const step = Math.max(1, Math.floor(files.length / numGpsPoints));

      for (let i = 0; i < numGpsPoints && i * step < files.length; i++) {
        const gpsPoint = filteredGpsPoints[i];
        const fileIndex = i * step;
        const frameFile = files[fileIndex];
        const framePath = path.join(outputDir, frameFile);

        if (fs.existsSync(framePath)) {
          frames.push({
            index: i,
            framePath: `/uploads/project_${projectId}_frames/${frameFile}`,
            lat: gpsPoint.lat,
            lon: gpsPoint.lon,
            heading: gpsPoint.heading || 0
          });
        }
      }

      console.log(`✓ ${frames.length} frames asociados con puntos GPS filtrados (3m distancia mínima)`);
      resolve(frames);
    } catch (e) {
      console.error('Error FFmpeg:', e.message);
      reject(new Error(`Error extrayendo frames: ${e.message}`));
    }
  });
}

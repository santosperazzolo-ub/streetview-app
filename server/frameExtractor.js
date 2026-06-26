import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Extraer frames del video y asociarlos con puntos GPS
export async function extractFramesFromVideo(videoPath, gpsPoints, projectId) {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(__dirname, 'uploads', `project_${projectId}_frames`);
    fs.mkdirSync(outputDir, { recursive: true });

    if (!gpsPoints || gpsPoints.length === 0) {
      return reject(new Error('Sin puntos GPS'));
    }

    console.log(`🎬 Extrayendo ${gpsPoints.length} frames del video con FFmpeg...`);

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

      // Si tenemos más frames de los que necesitamos, seleccionar uniformemente
      const frames = [];
      const step = Math.max(1, Math.floor(files.length / gpsPoints.length));

      for (let i = 0; i < gpsPoints.length && i * step < files.length; i++) {
        const gpsPoint = gpsPoints[i];
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

      console.log(`✓ ${frames.length} frames seleccionados y asociados con GPS`);
      resolve(frames);
    } catch (e) {
      console.error('Error FFmpeg:', e.message);
      reject(new Error(`Error extrayendo frames: ${e.message}`));
    }
  });
}

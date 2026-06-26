// Extrae un frame por cada punto GPS
export async function extractVideoFrames(videoFile, gpsPoints, onProgress) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const frames = [];

      console.log(`📹 Extrayendo ${gpsPoints.length} frames (un frame por punto GPS)`);

      // Calcular tiempo por punto GPS
      const timePerPoint = duration / (gpsPoints.length - 1);

      for (let i = 0; i < gpsPoints.length; i++) {
        const gpsPoint = gpsPoints[i];
        const timestamp = i * timePerPoint;

        await new Promise((resolveFrame) => {
          video.currentTime = timestamp;

          const onSeeked = () => {
            try {
              // Dibujar video en canvas
              canvas.width = video.videoWidth || 1280;
              canvas.height = video.videoHeight || 720;

              if (canvas.width > 0 && canvas.height > 0) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convertir a blob
                canvas.toBlob((blob) => {
                  if (blob) {
                    frames.push({
                      index: i,
                      timestamp,
                      blob,
                      gpsPoint: {
                        lat: gpsPoint.lat,
                        lon: gpsPoint.lon,
                        heading: gpsPoint.heading || 0,
                        accuracy: gpsPoint.accuracy || 0
                      }
                    });
                  }

                  onProgress?.({
                    current: i + 1,
                    total: gpsPoints.length,
                    percent: Math.round(((i + 1) / gpsPoints.length) * 100)
                  });

                  video.removeEventListener('seeked', onSeeked);
                  resolveFrame();
                }, 'image/jpeg', 0.85);
              } else {
                resolveFrame();
              }
            } catch (e) {
              console.error('Error drawing frame:', e);
              resolveFrame();
            }
          };

          video.addEventListener('seeked', onSeeked, { once: true });
        });
      }

      console.log(`✓ ${frames.length} frames extraídos`);
      resolve(frames);
    };

    video.onerror = (e) => {
      console.error('Video error:', e);
      reject(new Error('No se pudo cargar el video'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

// Convierte frames extraídos a un formato para enviar al servidor
export function prepareFramesForUpload(frames) {
  return frames.map((frame, i) => ({
    index: frame.index,
    gpsPoint: frame.gpsPoint,
    // El blob se enviará como FormData
  }));
}

// Genera panoramas equirectangulares a partir de frames (versión simple)
export async function generateEquirectangularFrame(frameBlob, heading = 0) {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Para una versión simple, solo repetitiamos la imagen
      // Una versión completa usaría algoritmos de proyección
      canvas.width = 4096;
      canvas.height = 2048;

      // Dibuja la imagen en el centro y la repite para simular 360°
      for (let i = 0; i < 4; i++) {
        ctx.drawImage(img, (img.width * i) - (heading * img.width / 360), 256);
      }

      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    };

    img.src = URL.createObjectURL(frameBlob);
  });
}

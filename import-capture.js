#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const captureDir = '/sdcard/Download/StreetViewCapture';

if (!fs.existsSync(captureDir)) {
  console.error(`❌ Carpeta no encontrada: ${captureDir}`);
  process.exit(1);
}

// Buscar carpetas de proyectos
const projects = fs.readdirSync(captureDir).filter(f =>
  fs.statSync(path.join(captureDir, f)).isDirectory()
);

if (projects.length === 0) {
  console.error('❌ Sin proyectos exportados');
  process.exit(1);
}

const lastProject = projects[projects.length - 1];
const projectDir = path.join(captureDir, lastProject);

console.log(`📦 Importando: ${lastProject}`);

// Buscar video y GPS
const files = fs.readdirSync(projectDir);
const videoFile = files.find(f => f.endsWith('.mp4') || f.endsWith('.MP4'));
const gpsFile = files.find(f => f.endsWith('gps_track.json'));

if (!videoFile || !gpsFile) {
  console.error('❌ Falta video o GPS JSON');
  process.exit(1);
}

// Copiar archivos
const srcVideo = path.join(projectDir, videoFile);
const destVideo = path.join(__dirname, 'video.MP4');
const srcGps = path.join(projectDir, gpsFile);
const destGps = path.join(__dirname, 'gps_track.json');

fs.copyFileSync(srcVideo, destVideo);
fs.copyFileSync(srcGps, destGps);

console.log(`✓ Video: ${videoFile}`);
console.log(`✓ GPS: ${gpsFile}`);

// Actualizar panos.js con puntos GPS
const gpsData = JSON.parse(fs.readFileSync(destGps, 'utf8'));

const panosCode = `export const panos = ${JSON.stringify(
  gpsData.map((point, i) => ({
    id: i + 1,
    lat: point.lat,
    lon: point.lon,
    heading: point.heading,
    image: '/video.MP4',
    video: true,
    links: i === 0 ? [2] : i === gpsData.length - 1 ? [i] : [i, i + 2]
  })),
  null,
  2
)};`;

fs.writeFileSync(path.join(__dirname, 'src/data/panos.js'), panosCode);

console.log(`\n✅ Importado: ${gpsData.length} puntos GPS`);
console.log(`📍 Ubicación: /home/santos/Proyectos/streetview-app/`);

#!/usr/bin/env node
/**
 * Uso: node scripts/procesar_video.cjs [video.MP4] [fps]
 *
 * Ejemplos:
 *   node scripts/procesar_video.cjs              → usa video.MP4, fps=2
 *   node scripts/procesar_video.cjs video.MP4 1  → 1 frame por segundo
 *   node scripts/procesar_video.cjs video.MP4 3  → 3 frames por segundo
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const videoArg = process.argv[2] || "video.MP4";
const fpsArg   = parseFloat(process.argv[3]) || 1;

const VIDEO    = path.resolve(videoArg);
const GPS_FILE = path.resolve("gps_track.json");
const PANOS_DIR = path.resolve("public/panos");
const OUTPUT   = path.resolve("src/data/panos.js");

// ── Validaciones ─────────────────────────────────────────────────────────────

if (!fs.existsSync(VIDEO)) {
  console.error(`❌ Video no encontrado: ${VIDEO}`);
  process.exit(1);
}
if (!fs.existsSync(GPS_FILE)) {
  console.error(`❌ GPS no encontrado: ${GPS_FILE}`);
  console.error("   Grabá el recorrido con la app (botón REC) y presioná STOP.");
  console.error("   El GPS se guarda automáticamente en gps_track.json.");
  process.exit(1);
}

// ── 1. Limpiar panos anteriores ───────────────────────────────────────────────

console.log("🗑  Limpiando panos anteriores...");
fs.mkdirSync(PANOS_DIR, { recursive: true });
fs.readdirSync(PANOS_DIR)
  .filter(f => f.endsWith(".jpg") || f.endsWith(".png"))
  .forEach(f => fs.unlinkSync(path.join(PANOS_DIR, f)));

// ── 2. Extraer frames con ffmpeg ──────────────────────────────────────────────

console.log(`🎬 Extrayendo frames del video a ${fpsArg} fps...`);
try {
  execSync(
    `ffmpeg -i "${VIDEO}" -vf fps=${fpsArg} "${PANOS_DIR}/pano_%04d.jpg" -y`,
    { stdio: "inherit" }
  );
} catch (e) {
  console.error("❌ Error ejecutando ffmpeg. ¿Está instalado?");
  process.exit(1);
}

// ── 3. Leer GPS y frames ──────────────────────────────────────────────────────

const gpsTrack = JSON.parse(fs.readFileSync(GPS_FILE, "utf-8"));
const files = fs.readdirSync(PANOS_DIR)
  .filter(f => f.endsWith(".jpg"))
  .sort();

console.log(`📸 Frames extraídos: ${files.length}`);
console.log(`📍 Puntos GPS: ${gpsTrack.length}`);

if (gpsTrack.length === 0) {
  console.error("❌ El gps_track.json está vacío.");
  process.exit(1);
}

// ── 4. Interpolar GPS por tiempo ──────────────────────────────────────────────

function interpolateGps(frameIndex, totalFrames) {
  const t = frameIndex / Math.max(totalFrames - 1, 1); // 0..1
  const rawIdx = t * (gpsTrack.length - 1);
  const i0 = Math.floor(rawIdx);
  const i1 = Math.min(i0 + 1, gpsTrack.length - 1);
  const frac = rawIdx - i0;

  const a = gpsTrack[i0];
  const b = gpsTrack[i1];

  return {
    lat: a.lat + (b.lat - a.lat) * frac,
    lon: a.lon + (b.lon - a.lon) * frac,
    heading: a.heading ?? b.heading ?? null,
  };
}

// ── 5. Filtrar frames por distancia mínima ────────────────────────────────────

// Distancia mínima entre puntos en metros (ajustable)
const MIN_DISTANCIA_M = parseFloat(process.argv[4]) || 3;

function distanciaMetros(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

const framesFiltrados = [];
let ultimoGps = null;

for (let i = 0; i < files.length; i++) {
  const gps = interpolateGps(i, files.length);
  if (!ultimoGps || distanciaMetros(ultimoGps, gps) >= MIN_DISTANCIA_M) {
    framesFiltrados.push({ file: files[i], gps });
    ultimoGps = gps;
  }
}

console.log(`📌 Puntos tras filtro (≥${MIN_DISTANCIA_M}m): ${framesFiltrados.length}`);

// ── 6. Generar panos.js ───────────────────────────────────────────────────────

const panos = framesFiltrados.map(({ file, gps }, index) => ({
  id: index + 1,
  lat: gps.lat,
  lon: gps.lon,
  heading: gps.heading,
  image: `/panos/${file}`,
  links: [index, index + 2].filter(v => v > 0 && v <= framesFiltrados.length),
}));

const output = `export const panos = ${JSON.stringify(panos, null, 2)};`;
fs.writeFileSync(OUTPUT, output);

console.log(`\n✅ Listo!`);
console.log(`   ${panos.length} puntos generados`);
console.log(`   Rango GPS: ${panos[0].lat.toFixed(5)},${panos[0].lon.toFixed(5)} → ${panos[panos.length-1].lat.toFixed(5)},${panos[panos.length-1].lon.toFixed(5)}`);
console.log(`\n▶  Iniciá la app con: npm run dev`);

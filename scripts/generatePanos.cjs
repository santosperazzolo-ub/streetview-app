const fs = require("fs");

const gpsTrack = JSON.parse(
  fs.readFileSync(
    "./gps_track.json",
    "utf-8"
  )
);

const panosDir =
  "./public/panos";

const files = fs
  .readdirSync(panosDir)
  .filter((f) =>
    f.endsWith(".jpg")
  )
  .sort();

function smoothPoint(index) {

  const points = [];

  for (
    let i = -2;
    i <= 2;
    i++
  ) {

    const idx =
      Math.min(
        Math.max(index + i, 0),
        gpsTrack.length - 1
      );

    points.push(
      gpsTrack[idx]
    );
  }

  const avgLat =
    points.reduce(
      (a, b) => a + b.lat,
      0
    ) / points.length;

  const avgLon =
    points.reduce(
      (a, b) => a + b.lon,
      0
    ) / points.length;

  return {
    lat: avgLat,
    lon: avgLon
  };
}

const STEP = 2;

const panos = files
  .filter((_, index) =>
    index % STEP === 0
  )
  .map((file, index) => {

    const gpsIndex =
      Math.floor(
        (index / files.length)
        *
        gpsTrack.length
      );

    const gps =
      smoothPoint(gpsIndex);

    return {

      id: index + 1,

      lat: gps.lat,

      lon: gps.lon,

      image:
        `/panos/${file}`,

      links: [
        index,
        index + 2
      ].filter(
        (v) =>
          v > 0 &&
          v <= files.length
      )
    };
  });

const output =
`export const panos = ${JSON.stringify(
  panos,
  null,
  2
)};`;

fs.writeFileSync(
  "./src/data/panos.js",
  output
);

console.log(
  "panos.js generado"
);

// Calcular distancia en metros entre dos puntos GPS (Haversine)
export function distanceBetweenPoints(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distancia en metros
}

// Filtrar puntos que estén a mínimo X metros de distancia
export function filterPointsByDistance(points, minDistance = 3) {
  if (points.length === 0) return [];

  const filtered = [points[0]]; // Siempre incluir el primero

  for (let i = 1; i < points.length; i++) {
    const lastPoint = filtered[filtered.length - 1];
    const distance = distanceBetweenPoints(
      lastPoint.lat,
      lastPoint.lon,
      points[i].lat,
      points[i].lon
    );

    if (distance >= minDistance) {
      filtered.push(points[i]);
    }
  }

  // Asegurar que el último punto esté incluido
  if (filtered[filtered.length - 1] !== points[points.length - 1]) {
    filtered.push(points[points.length - 1]);
  }

  return filtered;
}

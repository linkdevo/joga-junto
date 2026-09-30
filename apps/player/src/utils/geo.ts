/**
 * Distância entre duas coordenadas (fórmula de Haversine),
 * em quilômetros.
 */
export function distanceInKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) {
  const EARTH_RADIUS_KM = 6371;

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(deltaLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function formatDistance(km: number) {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }

  return `${km.toFixed(1).replace(".", ",")} km`;
}

/**
 * BitChat Geohash Implementation
 * 100% compatible with BitChat Android & iOS geohash channels
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BITS = [16, 8, 4, 2, 1];

export interface GeohashBounds {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeohashPrecisionLevel {
  precision: number;
  name: string;
  approxRadius: string;
  description: string;
}

export const GEOHASH_LEVELS: GeohashPrecisionLevel[] = [
  { precision: 4, name: 'Region', approxRadius: '~20 km', description: 'Metropolitan / District area' },
  { precision: 5, name: 'City / Town', approxRadius: '~5 km', description: 'City center & surrounding areas' },
  { precision: 6, name: 'Neighborhood', approxRadius: '~1.2 km', description: 'Immediate neighborhood (~2km)' },
  { precision: 7, name: 'Venue / Local', approxRadius: '~150 m', description: 'Building / Street block (~500m)' },
  { precision: 8, name: 'Micro-Local', approxRadius: '~38 m', description: 'Immediate spot / Room radius' },
];

/**
 * Encode latitude and longitude into Base32 Geohash
 */
export function encodeGeohash(latitude: number, longitude: number, precision: number = 6): string {
  if (precision <= 0) return '';
  
  let latInterval = [-90.0, 90.0];
  let lonInterval = [-180.0, 180.0];

  let isEven = true;
  let bit = 0;
  let ch = 0;
  let geohash = '';

  const lat = Math.max(-90.0, Math.min(90.0, latitude));
  const lon = Math.max(-180.0, Math.min(180.0, longitude));

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (lonInterval[0] + lonInterval[1]) / 2;
      if (lon >= mid) {
        ch |= BITS[bit];
        lonInterval[0] = mid;
      } else {
        lonInterval[1] = mid;
      }
    } else {
      const mid = (latInterval[0] + latInterval[1]) / 2;
      if (lat >= mid) {
        ch |= BITS[bit];
        latInterval[0] = mid;
      } else {
        latInterval[1] = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
}

/**
 * Decode geohash string into latitude/longitude bounding box and center
 */
export function decodeGeohash(geohash: string): { latitude: number; longitude: number; bounds: GeohashBounds } {
  let isEven = true;
  let latInterval = [-90.0, 90.0];
  let lonInterval = [-180.0, 180.0];

  const cleanHash = geohash.toLowerCase().trim();

  for (let i = 0; i < cleanHash.length; i++) {
    const c = cleanHash[i];
    const cd = BASE32.indexOf(c);
    if (cd === -1) continue;

    for (let j = 0; j < 5; j++) {
      const mask = BITS[j];
      if (isEven) {
        const mid = (lonInterval[0] + lonInterval[1]) / 2;
        if ((cd & mask) !== 0) {
          lonInterval[0] = mid;
        } else {
          lonInterval[1] = mid;
        }
      } else {
        const mid = (latInterval[0] + latInterval[1]) / 2;
        if ((cd & mask) !== 0) {
          latInterval[0] = mid;
        } else {
          latInterval[1] = mid;
        }
      }
      isEven = !isEven;
    }
  }

  const latitude = (latInterval[0] + latInterval[1]) / 2;
  const longitude = (lonInterval[0] + lonInterval[1]) / 2;

  return {
    latitude,
    longitude,
    bounds: {
      latMin: latInterval[0],
      latMax: latInterval[1],
      lonMin: lonInterval[0],
      lonMax: lonInterval[1],
    },
  };
}

/**
 * Haversine formula to compute great-circle distance between two points in km
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Format distance into human-readable text (meters or kilometers)
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  }
  return `${distanceKm.toFixed(1)}km away`;
}

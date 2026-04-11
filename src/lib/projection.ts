import type { Feature, Polygon, MultiPolygon, Position } from 'geojson';

// ---------------------------------------------------------------------------
// Spherical geometry helpers (bearing + distance approach)
//
// Each vertex is stored as {distance, heading} from the country's centroid.
// To place the country at a new center, we compute the destination point
// for each vertex using spherical math. This gives correct Mercator distortion
// at all latitudes — including the poles.
// ---------------------------------------------------------------------------

export interface LatLngLiteral { lat: number; lng: number }

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/** Haversine angular distance between two points (radians) */
function angularDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLng = (lng2 - lng1) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Forward azimuth (heading) from point 1 to point 2 (radians) */
function computeHeading(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const lat1R = lat1 * DEG2RAD;
  const lat2R = lat2 * DEG2RAD;
  const dLngR = (lng2 - lng1) * DEG2RAD;
  return Math.atan2(
    Math.sin(dLngR) * Math.cos(lat2R),
    Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLngR)
  );
}

/** Destination point given start, angular distance, and heading → [lng, lat] */
function computeDestination(
  lat: number, lng: number,
  dist: number, hdg: number
): [number, number] {
  if (dist === 0) return [lng, lat];
  const latR = lat * DEG2RAD;
  const sinLat = Math.sin(latR);
  const cosLat = Math.cos(latR);
  const sinDist = Math.sin(dist);
  const cosDist = Math.cos(dist);

  const newLatR = Math.asin(sinLat * cosDist + cosLat * sinDist * Math.cos(hdg));
  const newLngR =
    lng * DEG2RAD +
    Math.atan2(
      Math.sin(hdg) * sinDist * cosLat,
      cosDist - sinLat * Math.sin(newLatR)
    );

  // Normalize longitude to [-180, 180]
  let newLng = newLngR * RAD2DEG;
  newLng = ((newLng + 540) % 360) - 180;

  return [newLng, newLatR * RAD2DEG];
}

// ---------------------------------------------------------------------------
// Pre-computed paths for fast polygon updates
// ---------------------------------------------------------------------------

export interface PrecomputedPaths {
  /** Per-ring, per-vertex: angular distance (rad) and heading (rad) from centroid */
  offsets: { distance: number; heading: number }[][];
  /** Pre-allocated LatLngLiteral arrays reused across calls */
  paths: LatLngLiteral[][];
}

/**
 * Pre-compute spherical offsets (distance + heading from centroid) for each vertex.
 * Call once when a polygon is created.
 */
export function precomputeOffsets(
  geojson: Feature<Polygon | MultiPolygon>,
  originalCentroid: [number, number]
): PrecomputedPaths {
  const [origLng, origLat] = originalCentroid;

  const offsets: { distance: number; heading: number }[][] = [];
  const paths: LatLngLiteral[][] = [];

  const rings: Position[][] =
    geojson.geometry.type === 'Polygon'
      ? geojson.geometry.coordinates
      : geojson.geometry.coordinates.flat();

  for (const ring of rings) {
    const ringOffsets: { distance: number; heading: number }[] = new Array(ring.length);
    const ringPath: LatLngLiteral[] = new Array(ring.length);
    for (let i = 0; i < ring.length; i++) {
      const [vLng, vLat] = ring[i];
      ringOffsets[i] = {
        distance: angularDistance(origLat, origLng, vLat, vLng),
        heading: computeHeading(origLat, origLng, vLat, vLng),
      };
      ringPath[i] = { lat: 0, lng: 0 };
    }
    offsets.push(ringOffsets);
    paths.push(ringPath);
  }

  return { offsets, paths };
}

/**
 * Apply a new target center to pre-computed offsets using spherical destination.
 * Writes directly into pre-allocated path arrays.
 */
export function applyOffsetsToPath(
  pre: PrecomputedPaths,
  targetCenter: [number, number]
): LatLngLiteral[][] {
  const [targetLng, targetLat] = targetCenter;

  for (let r = 0; r < pre.offsets.length; r++) {
    const ringOffsets = pre.offsets[r];
    const ringPath = pre.paths[r];
    for (let i = 0; i < ringOffsets.length; i++) {
      const [lng, lat] = computeDestination(
        targetLat, targetLng,
        ringOffsets[i].distance, ringOffsets[i].heading
      );
      ringPath[i].lat = lat;
      ringPath[i].lng = lng;
    }
  }

  return pre.paths;
}

/**
 * Compute the new center after a native Google Maps drag.
 *
 * Native drag translates all vertices by the same lat/lng delta.
 * We apply that same delta to the previous center.
 */
export function computeNewCenterFromDrag(
  previousCenter: [number, number],
  startVertexLng: number,
  startVertexLat: number,
  endVertexLng: number,
  endVertexLat: number
): [number, number] {
  return [
    previousCenter[0] + (endVertexLng - startVertexLng),
    previousCenter[1] + (endVertexLat - startVertexLat),
  ];
}

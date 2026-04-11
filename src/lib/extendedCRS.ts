import L from 'leaflet';

/**
 * Custom CRS that extends the Mercator projection beyond the default ±85.05°
 * latitude limit, allowing polygons to overflow into empty space near the poles
 * and continue distorting naturally.
 */

const EXTENDED_MAX_LATITUDE = 89;
const R = 6378137; // Earth radius (same as Leaflet)
const d = R * Math.PI; // x-extent (unchanged)

// Compute y-extent for the extended latitude
const maxLatRad = (EXTENDED_MAX_LATITUDE * Math.PI) / 180;
const sinMax = Math.sin(maxLatRad);
const yMax = (R * Math.log((1 + sinMax) / (1 - sinMax))) / 2;

const ExtendedSphericalMercator = {
  ...(L.Projection.SphericalMercator as L.Projection & { MAX_LATITUDE: number }),
  MAX_LATITUDE: EXTENDED_MAX_LATITUDE,
  bounds: new L.Bounds(new L.Point(-d, -yMax), new L.Point(d, yMax)),
};

export const ExtendedCRS: L.CRS = L.Util.extend({}, L.CRS.EPSG3857, {
  projection: ExtendedSphericalMercator,
});

import { memo, useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  precomputeOffsets,
  applyOffsetsToPath,
  type PrecomputedPaths,
  type LatLngLiteral,
} from '@/lib/projection';
import { useMapContext } from '@/context/useMapContext';
import type { PlacedCountry } from '@/types';

interface CountryOverlayProps {
  placed: PlacedCountry;
  isActive: boolean;
}

/** Convert {lat, lng}[][] to Leaflet [lat, lng][][], unwrapping longitudes
 *  relative to centerLng so vertices near the antimeridian stay continuous. */
function toLatLngTuples(
  paths: LatLngLiteral[][],
  centerLng: number,
): [number, number][][] {
  return paths.map((ring) =>
    ring.map((p) => {
      let lng = p.lng;
      while (lng - centerLng > 180) lng -= 360;
      while (lng - centerLng < -180) lng += 360;
      return [p.lat, lng];
    }),
  );
}

export const CountryOverlay = memo(
  function CountryOverlay({ placed, isActive }: CountryOverlayProps) {
    const map = useMap();
    const polygonRef = useRef<L.Polygon | null>(null);
    const precomputed = useRef<PrecomputedPaths | null>(null);
    const currentCenterRef = useRef<[number, number]>(placed.currentCenter);
    currentCenterRef.current = placed.currentCenter;
    const isActiveRef = useRef(isActive);
    isActiveRef.current = isActive;

    // Drag state
    const isDragging = useRef(false);
    const dragStartLatLng = useRef<L.LatLng | null>(null);
    const dragStartCenter = useRef<[number, number]>([0, 0]);

    const setActiveCountry = useMapContext((s) => s.setActiveCountry);
    const updateCountryCenter = useMapContext((s) => s.updateCountryCenter);

    // Apply target center using pre-computed spherical offsets
    function updatePolygonFast(center: [number, number]) {
      if (!polygonRef.current || !precomputed.current) return;
      const paths = applyOffsetsToPath(precomputed.current, center);
      polygonRef.current.setLatLngs(toLatLngTuples(paths, center[0]));
    }

    // Create / destroy the polygon
    useEffect(() => {
      // Pre-compute spherical offsets (distance + heading) once for this country
      const pre = precomputeOffsets(
        placed.country.geojson,
        placed.country.centroid,
      );
      precomputed.current = pre;

      // Compute initial paths
      const paths = applyOffsetsToPath(pre, placed.currentCenter);
      const positions = toLatLngTuples(paths, placed.currentCenter[0]);

      const polygon = L.polygon(positions, {
        color: placed.color,
        weight: 2,
        opacity: 1,
        fillColor: placed.color,
        fillOpacity: 0.35,
        interactive: true,
      });

      polygon.addTo(map);
      polygonRef.current = polygon;

      // Click to activate
      polygon.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setActiveCountry(placed.id);
      });

      // Drag start: mousedown on polygon
      polygon.on('mousedown', (e) => {
        L.DomEvent.stopPropagation(e);
        isDragging.current = true;
        dragStartLatLng.current = (e as L.LeafletMouseEvent).latlng;
        dragStartCenter.current = [...currentCenterRef.current];
        setActiveCountry(placed.id);
        polygon.setStyle({ weight: 3 });
        map.dragging.disable();
      });

      return () => {
        polygon.remove();
        polygonRef.current = null;
        precomputed.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, placed.id, placed.color]);

    // Map-level mousemove/mouseup for drag tracking
    useMapEvents({
      mousemove(e) {
        if (!isDragging.current || !dragStartLatLng.current) return;
        const deltaLat = e.latlng.lat - dragStartLatLng.current.lat;
        const deltaLng = e.latlng.lng - dragStartLatLng.current.lng;
        const newCenter: [number, number] = [
          dragStartCenter.current[0] + deltaLng,
          dragStartCenter.current[1] + deltaLat,
        ];
        updatePolygonFast(newCenter);
      },
      mouseup(e) {
        if (!isDragging.current || !dragStartLatLng.current) return;
        isDragging.current = false;
        map.dragging.enable();

        const deltaLat = e.latlng.lat - dragStartLatLng.current.lat;
        const deltaLng = e.latlng.lng - dragStartLatLng.current.lng;
        const newCenter: [number, number] = [
          dragStartCenter.current[0] + deltaLng,
          dragStartCenter.current[1] + deltaLat,
        ];

        polygonRef.current?.setStyle({
          weight: isActiveRef.current ? 3 : 2,
        });

        updateCountryCenter(placed.id, newCenter);
        dragStartLatLng.current = null;
      },
    });

    // Update paths when currentCenter changes externally (from store)
    useEffect(() => {
      if (isDragging.current) return;
      updatePolygonFast(placed.currentCenter);
    }, [placed.currentCenter]);

    // Update active styling without recreating the polygon
    useEffect(() => {
      if (polygonRef.current) {
        polygonRef.current.setStyle({
          weight: isActive ? 3 : 2,
        });
        if (isActive) {
          polygonRef.current.bringToFront();
        }
      }
    }, [isActive]);

    return null;
  },
  (prev, next) =>
    prev.placed.id === next.placed.id &&
    prev.placed.color === next.placed.color &&
    prev.placed.currentCenter[0] === next.placed.currentCenter[0] &&
    prev.placed.currentCenter[1] === next.placed.currentCenter[1] &&
    prev.isActive === next.isActive,
);

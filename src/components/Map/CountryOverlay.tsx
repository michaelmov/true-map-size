import { memo, useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import {
  precomputeOffsets,
  applyOffsetsToPath,
  computeNewCenterFromDrag,
  type PrecomputedPaths,
} from '@/lib/projection';
import { useMapContext } from '@/context/useMapContext';
import type { PlacedCountry } from '@/types';

interface CountryOverlayProps {
  placed: PlacedCountry;
  isActive: boolean;
}

export const CountryOverlay = memo(function CountryOverlay({
  placed,
  isActive,
}: CountryOverlayProps) {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const precomputed = useRef<PrecomputedPaths | null>(null);
  const currentCenterRef = useRef<[number, number]>(placed.currentCenter);
  currentCenterRef.current = placed.currentCenter;
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  // Drag state
  const dragStartVertex = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const justDragged = useRef(false);

  const setActiveCountry = useMapContext((s) => s.setActiveCountry);
  const updateCountryCenter = useMapContext((s) => s.updateCountryCenter);

  // Apply target center using pre-computed spherical offsets
  function updatePolygonFast(center: [number, number]) {
    if (!polygonRef.current || !precomputed.current) return;
    const paths = applyOffsetsToPath(precomputed.current, center);
    polygonRef.current.setPaths(paths);
  }

  // Create / destroy the polygon
  useEffect(() => {
    if (!map) return;

    // Pre-compute spherical offsets (distance + heading) once for this country
    const pre = precomputeOffsets(placed.country.geojson, placed.country.centroid);
    precomputed.current = pre;

    // Compute initial paths
    const paths = applyOffsetsToPath(pre, placed.currentCenter);

    const polygon = new google.maps.Polygon({
      paths,
      strokeColor: placed.color,
      strokeWeight: 2,
      strokeOpacity: 1,
      fillColor: placed.color,
      fillOpacity: 0.35,
      map,
      clickable: true,
      draggable: true,
      geodesic: true, // Real-time Mercator distortion during drag — zero JS per frame
      zIndex: 1,
    });

    polygonRef.current = polygon;

    // Click to activate
    polygon.addListener('click', () => {
      setActiveCountry(placed.id);
    });

    // Native drag — geodesic: true handles real-time resize at WebGL level
    polygon.addListener('dragstart', () => {
      setActiveCountry(placed.id);
      polygon.setOptions({ strokeWeight: 3 });
      // Save vertex[0][0] position before drag for delta computation
      const v = polygon.getPath().getAt(0);
      dragStartVertex.current = { lat: v.lat(), lng: v.lng() };
    });

    polygon.addListener('dragend', () => {
      polygon.setOptions({ strokeWeight: isActiveRef.current ? 3 : 2 });

      // Compute new center from vertex delta
      const v = polygon.getPath().getAt(0);
      const newCenter = computeNewCenterFromDrag(
        currentCenterRef.current,
        dragStartVertex.current.lng,
        dragStartVertex.current.lat,
        v.lng(),
        v.lat()
      );

      // Don't call setPaths — leave the polygon exactly where the user dropped it.
      // Just commit the new center to the store.
      justDragged.current = true;
      updateCountryCenter(placed.id, newCenter);
    });

    return () => {
      polygon.setMap(null);
      polygonRef.current = null;
      precomputed.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, placed.id, placed.color]);

  // Update paths when currentCenter changes externally (from store)
  useEffect(() => {
    if (justDragged.current) {
      // Skip — polygon is already at the correct position from native drag
      justDragged.current = false;
      return;
    }
    updatePolygonFast(placed.currentCenter);
  }, [placed.currentCenter]);

  // Update active styling without recreating the polygon
  useEffect(() => {
    if (polygonRef.current) {
      polygonRef.current.setOptions({
        strokeWeight: isActive ? 3 : 2,
        zIndex: isActive ? 10 : 1,
      });
    }
  }, [isActive]);

  return null;
},
(prev, next) =>
  prev.placed.id === next.placed.id &&
  prev.placed.color === next.placed.color &&
  prev.placed.currentCenter[0] === next.placed.currentCenter[0] &&
  prev.placed.currentCenter[1] === next.placed.currentCenter[1] &&
  prev.isActive === next.isActive
);

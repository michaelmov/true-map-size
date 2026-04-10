import { memo, useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import {
  precomputeOffsets,
  applyOffsetsToPath,
  computeNewCenterFromDrag,
  type PrecomputedPaths,
} from '@/lib/projection';
import { useMapStore } from '@/store/mapStore';
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

  const setActiveCountry = useMapStore((s) => s.setActiveCountry);
  const updateCountryCenter = useMapStore((s) => s.updateCountryCenter);

  // Fast path: apply target center using pre-computed offsets (no allocations)
  function updatePolygonFast(center: [number, number]) {
    if (!polygonRef.current || !precomputed.current) return;
    const paths = applyOffsetsToPath(precomputed.current, center);
    polygonRef.current.setPaths(paths);
  }

  // Create / destroy the polygon
  useEffect(() => {
    if (!map) return;

    // Pre-compute offsets once for this country
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
      geodesic: true,
      zIndex: 1,
    });

    polygonRef.current = polygon;

    // Click to activate
    polygon.addListener('click', () => {
      setActiveCountry(placed.id);
    });

    // Native drag — Google Maps handles movement at the WebGL level (zero JS per frame)
    polygon.addListener('dragstart', () => {
      setActiveCountry(placed.id);
      polygon.setOptions({ strokeWeight: 3 });
    });

    polygon.addListener('dragend', () => {
      polygon.setOptions({ strokeWeight: isActiveRef.current ? 3 : 2 });

      // Compute new center from the drag delta
      const newCenter = computeNewCenterFromDrag(
        polygon,
        precomputed.current!,
        currentCenterRef.current
      );

      // Reproject with true-size cosine math and snap
      updatePolygonFast(newCenter);
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
    updatePolygonFast(placed.currentCenter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

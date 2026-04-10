import { Map } from '@vis.gl/react-google-maps';
import { CountryOverlay } from './CountryOverlay';
import { useMapStore } from '@/store/mapStore';

const GRAYSCALE_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ saturation: -100 }] },
];

export function MapContainer() {
  const placedCountries = useMapStore((s) => s.placedCountries);
  const activeCountryId = useMapStore((s) => s.activeCountryId);

  return (
    <Map
      defaultCenter={{ lat: 20, lng: 0 }}
      defaultZoom={3}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl={false}
      styles={GRAYSCALE_STYLES}
      className="w-full h-full"
    >
      {placedCountries.map((placed) => (
        <CountryOverlay
          key={placed.id}
          placed={placed}
          isActive={placed.id === activeCountryId}
        />
      ))}
    </Map>
  );
}

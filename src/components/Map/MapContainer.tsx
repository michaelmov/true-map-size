import { MapContainer as LeafletMapContainer, TileLayer } from 'react-leaflet';
import { CountryOverlay } from './CountryOverlay';
import { useMapContext } from '@/context/useMapContext';
import { useThemeContext } from '@/context/useThemeContext';
import { ExtendedCRS } from '@/lib/extendedCRS';

const TILE_URLS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
} as const;

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

export function MapContainer() {
  const placedCountries = useMapContext((s) => s.placedCountries);
  const activeCountryId = useMapContext((s) => s.activeCountryId);
  const theme = useThemeContext((s) => s.theme);

  return (
    <LeafletMapContainer
      center={[20, 0]}
      zoom={3}
      crs={ExtendedCRS}
      scrollWheelZoom={true}
      zoomControl={false}
      className="w-full h-full"
    >
      <TileLayer
        key={theme}
        url={TILE_URLS[theme]}
        attribution={ATTRIBUTION}
        bounds={[[-85.05, -180], [85.05, 180]]}
      />
      {placedCountries.map((placed) => (
        <CountryOverlay
          key={placed.id}
          placed={placed}
          isActive={placed.id === activeCountryId}
        />
      ))}
    </LeafletMapContainer>
  );
}

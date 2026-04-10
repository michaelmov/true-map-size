import { useEffect, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { MapContainer } from '@/components/Map/MapContainer';
import { SearchCard } from '@/components/Sidebar/SearchCard';
import { loadCountries } from '@/lib/countries';
import { useMapContext, MapProvider } from '@/context/MapContext';
import { ThemeProvider } from '@/context/ThemeContext';
import type { Country } from '@/types';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

function AppContent() {
  const [countries, setCountries] = useState<Country[]>([]);
  const addCountry = useMapContext((s) => s.addCountry);

  useEffect(() => {
    loadCountries().then(setCountries);
  }, []);

  return (
    <div className="relative w-full h-full">
      <MapContainer />
      <SearchCard countries={countries} onSelect={addCountry} />
    </div>
  );
}

function App() {
  return (
    <APIProvider apiKey={API_KEY}>
      <ThemeProvider>
        <MapProvider>
          <AppContent />
        </MapProvider>
      </ThemeProvider>
    </APIProvider>
  );
}

export default App;

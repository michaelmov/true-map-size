import { useEffect, useRef, useState } from 'react';
import { MapContainer } from '@/components/Map/MapContainer';
import { SearchCard } from '@/components/Sidebar/SearchCard';
import { loadCountries } from '@/lib/countries';
import { MapProvider } from '@/context/MapContext';
import { useMapContext } from '@/context/useMapContext';
import { ThemeProvider } from '@/context/ThemeContext';
import type { Country } from '@/types';

const DEFAULT_COUNTRIES: { code: string; center: [number, number] }[] = [
  { code: 'US', center: [-20, 25] },
  { code: 'GL', center: [20, 25] },
  { code: 'IN', center: [0, 5] },
];

function AppContent() {
  const [countries, setCountries] = useState<Country[]>([]);
  const addCountry = useMapContext((s) => s.addCountry);
  const setActiveCountry = useMapContext((s) => s.setActiveCountry);
  const initialized = useRef(false);

  useEffect(() => {
    loadCountries().then(setCountries);
  }, []);

  useEffect(() => {
    if (countries.length === 0 || initialized.current) return;
    initialized.current = true;
    for (const { code, center } of DEFAULT_COUNTRIES) {
      const country = countries.find((c) => c.code === code);
      if (country) addCountry(country, center);
    }
    setActiveCountry(null);
  }, [countries, addCountry, setActiveCountry]);

  return (
    <div className="relative w-full h-full">
      <MapContainer />
      <SearchCard countries={countries} onSelect={addCountry} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <MapProvider>
        <AppContent />
      </MapProvider>
    </ThemeProvider>
  );
}

export default App;

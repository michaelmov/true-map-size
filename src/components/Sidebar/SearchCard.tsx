import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CountrySearch } from './CountrySearch';
import { SelectedCountryList } from './SelectedCountryList';
import { ThemeToggle } from './ThemeToggle';
import type { Country } from '@/types';

interface SearchCardProps {
  countries: Country[];
  onSelect: (country: Country) => void;
}

export function SearchCard({ countries, onSelect }: SearchCardProps) {
  return (
    <Card className="absolute top-8 left-8 z-10 w-72 overflow-visible backdrop-blur-md bg-card/90 shadow-lg transition-colors duration-300">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base font-semibold">
          True Country Size
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <CountrySearch countries={countries} onSelect={onSelect} />
        <SelectedCountryList />
      </CardContent>
      <CardFooter className="justify-between px-4 py-3">
        <span className="text-xs text-muted-foreground">Theme</span>
        <ThemeToggle />
      </CardFooter>
    </Card>
  );
}

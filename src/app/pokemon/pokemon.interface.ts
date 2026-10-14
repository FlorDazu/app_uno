export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  sprites: {
    front_default?: string | null;
    front_shiny?: string | null;
    other?: {
      'official-artwork'?: {
        front_default?: string | null;
      };
      'dream-world'?: {
        front_default?: string | null;
      };
    };
  };
  height: number;
  weight: number;
  abilities?: Array<{
    ability: { name: string; url: string };
    is_hidden: boolean;
  }>;
  stats?: Array<{
    base_stat: number;
    stat: { name: string; url: string };
  }>;
  cries?: {
    latest?: string;
    legacy?: string;
  };
}

export interface PokemonListItem {
  id: number;
  name: string;
  url: string;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  base_experience: number;
  abilities: Array<{ ability: { name: string; url: string }; is_hidden: boolean }>;
  habitat: any;
  genera: Array<{ genus: { name: string }; language: { name: string } }>;
}

export interface TypeInfo {
  name: string;
  url: string;
}

export interface PokemonsList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{ name: string; url: string }>;
}
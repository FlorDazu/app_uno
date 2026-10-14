import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, finalize, forkJoin, switchMap, tap } from 'rxjs';
import { Pokemon, PokemonListItem } from './pokemon.interface';

interface PokemonsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{ name: string; url: string }>;
}

interface TypeResponse {
  types: Array<{ type: { name: string; url: string } }>;
}

interface TypePokemonResponse {
  pokemon: Array<{ pokemon: { name: string; url: string } }>;
}

interface RawPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: Array<{ type: { name: string; url: string } }>;
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

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  private apiBase = 'https://pokeapi.co/api/v2';

  constructor(private http: HttpClient) { }

  /**
   * Get a list of Pokémon with full details loaded
   * @param page Page number (0-indexed)
   * @param limit Number of results per page
   */
  getPokemons(page: number = 0, limit: number = 20): Observable<Pokemon[]> {
    const url = `${this.apiBase}/pokemon?limit=${limit}&offset=${page * limit}`;
    return this.http.get<PokemonsListResponse>(url).pipe(
      switchMap(response => {
        const results = response?.results || [];
        if (results.length === 0) {
          return of([] as Pokemon[]);
        }
        // Load full details for each Pokémon in parallel
        const requests = results.map(item => this.fetchPokemonDetails(item.url));
        return forkJoin(requests);
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('Error fetching pokemons:', err.message || err);
        return of([] as Pokemon[]);
      })
    );
  }

  /**
   * Get a single Pokémon by name or number
   * @param name Pokémon name or number
   */
  getPokemonByName(name: string | number): Observable<Pokemon | null> {
    if (!name && name !== 0) {
      return of(null);
    }
    const url = `${this.apiBase}/pokemon/${name}`;
    return this.http.get<RawPokemon>(url).pipe(
      map(raw => this.mapRawPokemon(raw)),
      catchError((err: HttpErrorResponse) => {
        console.error(`Error fetching ${name}:`, err.status, err.message);
        // Distinguish between 404 (not found) and network errors
        if (err.status === 404) {
          return of(null);
        }
        return of(null);
      })
    );
  }

  /**
   * Search for a Pokémon directly by name (trimmed + lowercased)
   * @param name Pokémon name
   * @returns Observable<Pokemon | null> - null if not found or error
   */
  searchPokemon(name: string): Observable<Pokemon | null> {
    const term = (name || '').trim().toLowerCase();
    if (!term) {
      return of(null);
    }
    
    const url = `${this.apiBase}/pokemon/${term}`;
    return this.http.get<RawPokemon>(url).pipe(
      map(raw => this.mapRawPokemon(raw)),
      catchError((err: HttpErrorResponse) => {
        // CRITICAL: catchError prevents the Observable from breaking on 404 or network error
        console.error(`Search error for "${term}":`, err.status, err.message);
        return of(null); // Return null so component can show "not found"
      })
    );
  }

  /**
   * Get all Pokémon types from the API
   */
  getPokemonTypes(): Observable<string[]> {
    return this.http.get<TypeResponse>(`${this.apiBase}/type`).pipe(
      map(response => {
        const types = response?.types || [];
        return types.map(t => t.type?.name).filter((name): name is string => !!name);
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('Error fetching types:', err.message || err);
        return of([] as string[]);
      })
    );
  }

  /**
   * Get Pokémon filtered by type
   * @param type Pokémon type (e.g., 'fire', 'water', 'grass')
   * @param page Page number
   * @param limit Results per page
   */
  getPokemonByType(type: string, page: number = 0, limit: number = 20): Observable<Pokemon[]> {
    const url = `${this.apiBase}/type/${type}/pokemon?limit=${limit}&offset=${page * limit}`;
    return this.http.get<TypePokemonResponse>(url).pipe(
      switchMap(response => {
        const pokemons = response?.pokemon || [];
        if (pokemons.length === 0) {
          return of([] as Pokemon[]);
        }
        const requests = pokemons.slice(0, limit).map(item => this.fetchPokemonDetails(item.pokemon?.url));
        return forkJoin(requests);
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(`Error fetching ${type} type pokemons:`, err.message || err);
        return of([] as Pokemon[]);
      })
    );
  }

  /**
   * Fetch full Pokémon details from URL
   */
  private fetchPokemonDetails(url: string): Observable<Pokemon> {
    if (!url) {
      return of(this.getEmptyPokemon());
    }
    return this.http.get<RawPokemon>(url).pipe(
      map(raw => this.mapRawPokemon(raw)),
      catchError(() => of(this.getEmptyPokemon()))
    );
  }

  /**
   * Map raw API Pokemon to our internal Pokemon interface with defensive validation
   */
  private mapRawPokemon(raw: RawPokemon | null | undefined): Pokemon {
    if (!raw) {
      return this.getEmptyPokemon();
    }

    return {
      id: raw.id || 0,
      name: raw.name || '',
      types: (raw.types || []).map(t => t.type?.name).filter((name): name is string => !!name),
      sprites: {
        front_default: raw.sprites?.front_default || null,
        front_shiny: raw.sprites?.front_shiny || null,
        other: {
          'official-artwork': {
            front_default: raw.sprites?.other?.['official-artwork']?.front_default || null
          },
          'dream-world': {
            front_default: raw.sprites?.other?.['dream-world']?.front_default || null
          }
        }
      },
      height: raw.height || 0,
      weight: raw.weight || 0,
      abilities: (raw.abilities || []).map(a => ({
        ability: { name: a.ability?.name || '', url: a.ability?.url || '' },
        is_hidden: a.is_hidden || false
      })),
      stats: (raw.stats || []).map(s => ({
        base_stat: s.base_stat || 0,
        stat: { name: s.stat?.name || '', url: s.stat?.url || '' }
      })),
      cries: raw.cries || {}
    };
  }

  /**
   * Get an empty Pokemon object (fallback)
   */
  private getEmptyPokemon(): Pokemon {
    return {
      id: 0,
      name: '',
      types: [],
      sprites: {
        front_default: null,
        front_shiny: null,
        other: {
          'official-artwork': { front_default: null },
          'dream-world': { front_default: null }
        }
      },
      height: 0,
      weight: 0,
      abilities: [],
      stats: [],
      cries: {}
    };
  }

  /**
   * Get the best available image URL for a Pokémon (with fallbacks)
   */
  getBestImageUrl(pokemon: Pokemon): string {
    // Priority: official-artwork > dream-world > front_default > placeholder
    const officialArtwork = pokemon.sprites?.other?.['official-artwork']?.front_default;
    if (officialArtwork) {
      return officialArtwork;
    }

    const dreamWorld = pokemon.sprites?.other?.['dream-world']?.front_default;
    if (dreamWorld) {
      return dreamWorld;
    }

    const frontDefault = pokemon.sprites?.front_default;
    if (frontDefault) {
      return frontDefault;
    }

    // Fallback placeholder image (SVG data URI - no external file needed)
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="%23f0f0f0" width="200" height="200"/><text x="100" y="100" font-family="Arial" font-size="50" text-anchor="middle" fill="%23ccc">?</text></svg>';
  }
}
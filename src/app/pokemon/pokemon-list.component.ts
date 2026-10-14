import { Component, OnInit, OnDestroy } from '@angular/core';
import { PokemonService } from './pokemon.service';
import { Pokemon } from './pokemon.interface';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pokemon-list.component.html',
  styleUrls: ['./pokemon-list.component.css'],
  providers: [PokemonService]
})
export class PokemonListComponent implements OnInit, OnDestroy {
  pokemons: Pokemon[] = [];
  isLoading = true;
  hasError = false;
  errorMessage = '';
  notFound = false;
  currentPage = 0;
  pageSize = 24;
  allTypes: string[] = [];
  selectedType: string = '';
  searchTerm: string = '';
  totalPokemons = 0;
  searchResult: Pokemon | null = null;

  private destroy$ = new Subject<void>();

  // Type colors for badges
  typeColors: Record<string, string> = {
    normal: '#A8A77A',
    fire: '#EE8130',
    water: '#6390F0',
    electric: '#F7D02C',
    grass: '#7AC74C',
    ice: '#96D9D6',
    fighting: '#C22E28',
    poison: '#A33EA1',
    ground: '#E2BF65',
    flying: '#A98FF3',
    psychic: '#F95587',
    bug: '#A6B91A',
    rock: '#B6A136',
    ghost: '#735797',
    dragon: '#6F35FC',
    dark: '#705746',
    steel: '#B7B7CE',
    fairy: '#D685AD'
  };

  constructor(
    private pokemonService: PokemonService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPokemons();
    this.loadTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPokemons(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    this.pokemonService.getPokemons(this.currentPage, this.pageSize).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        // CRITICAL: Always stop loading, even if request fails
        this.isLoading = false;
      })
    ).subscribe({
      next: (pokemons) => {
        this.pokemons = pokemons || [];
        this.totalPokemons = this.pokemons.length;
        if (this.pokemons.length === 0 && !this.searchTerm && !this.selectedType) {
          this.hasError = true;
          this.errorMessage = 'No se pudieron cargar los Pokémon. Verifica tu conexión.';
        }
      },
      error: (err) => {
        console.error('Error loading pokemons:', err);
        this.hasError = true;
        this.errorMessage = 'No se pudo cargar la información de los Pokémon.';
        this.pokemons = [];
      }
    });
  }

  loadTypes(): void {
    this.pokemonService.getPokemonTypes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (types) => {
        this.allTypes = types || [];
      },
      error: (err) => {
        console.error('Error loading types:', err);
        this.allTypes = [];
      }
    });
  }

  setPage(page: number): void {
    if (page < 0) return;
    this.currentPage = page;
    if (this.selectedType) {
      this.loadPokemonsByType();
    } else {
      this.loadPokemons();
    }
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onTypeFilterChange(type: string): void {
    if (this.selectedType === type) {
      // Deselect
      this.selectedType = '';
      this.currentPage = 0;
      this.loadPokemons();
    } else {
      this.selectedType = type;
      this.currentPage = 0;
      this.searchTerm = '';
      this.loadPokemonsByType();
    }
  }

  onSearchChange(term: string): void {
    this.searchTerm = term || '';
    this.currentPage = 0;
    
    const trimmed = this.searchTerm.trim();
    if (trimmed) {
      // Direct API search for exact Pokémon name
      this.searchPokemon(trimmed);
    } else {
      // Empty search - reload normal list
      this.searchResult = null;
      this.notFound = false;
      if (this.selectedType) {
        this.loadPokemonsByType();
      } else {
        this.loadPokemons();
      }
    }
  }

  /**
   * Direct search on PokeAPI - finds exact Pokémon by name
   */
  searchPokemon(term: string): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.notFound = false;
    this.searchResult = null;

    this.pokemonService.searchPokemon(term).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        // CRITICAL: Always stop loading, even if request fails
        this.isLoading = false;
      })
    ).subscribe({
      next: (pokemon) => {
        if (pokemon && pokemon.id > 0) {
          // Found - show single result
          this.searchResult = pokemon;
          this.pokemons = [pokemon];
          this.notFound = false;
        } else {
          // Not found - null returned
          this.pokemons = [];
          this.searchResult = null;
          this.notFound = true;
        }
      },
      error: (err) => {
        // This shouldn't happen since catchError handles it, but safety net
        console.error('Error searching pokemon:', err);
        this.pokemons = [];
        this.searchResult = null;
        this.notFound = true;
        this.hasError = false; // Use notFound UI instead of hasError
      }
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchResult = null;
    this.notFound = false;
    this.currentPage = 0;
    if (this.selectedType) {
      this.loadPokemonsByType();
    } else {
      this.loadPokemons();
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedType = '';
    this.searchResult = null;
    this.notFound = false;
    this.currentPage = 0;
    this.loadPokemons();
  }

  private loadPokemonsByType(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    this.pokemonService.getPokemonByType(this.selectedType, this.currentPage, this.pageSize).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        // CRITICAL: Always stop loading, even if request fails
        this.isLoading = false;
      })
    ).subscribe({
      next: (pokemons) => {
        this.pokemons = pokemons || [];
        this.totalPokemons = this.pokemons.length;
        if (this.pokemons.length === 0) {
          this.hasError = true;
          this.errorMessage = `No se encontraron Pokémon de tipo "${this.selectedType}".`;
        }
      },
      error: (err) => {
        console.error('Error loading type pokemons:', err);
        this.hasError = true;
        this.errorMessage = 'Error cargando Pokémon por tipo.';
        this.pokemons = [];
      }
    });
  }

  get filteredPokemons(): Pokemon[] {
    let result = [...this.pokemons];

    // Search by name
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p => p.name && p.name.toLowerCase().includes(term));
    }

    return result;
  }

  get hasActiveFilters(): boolean {
    return !!this.searchTerm || !!this.selectedType;
  }

  viewPokemonDetails(pokemon: Pokemon): void {
    if (pokemon && pokemon.id > 0) {
      this.router.navigate(['/pokemon'], { queryParams: { id: pokemon.id } });
    }
  }

  getTypeColor(type: string): string {
    return this.typeColors[type] || '#777';
  }

  getPokemonImage(pokemon: Pokemon): string {
    return this.pokemonService.getBestImageUrl(pokemon);
  }

  onImageError(event: Event, pokemon: Pokemon): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      const officialArtwork = pokemon.sprites?.other?.['official-artwork']?.front_default;
      const dreamWorld = pokemon.sprites?.other?.['dream-world']?.front_default;
      const frontDefault = pokemon.sprites?.front_default;

      if (img.src !== officialArtwork && officialArtwork) {
        img.src = officialArtwork;
      } else if (img.src !== dreamWorld && dreamWorld) {
        img.src = dreamWorld;
      } else if (img.src !== frontDefault && frontDefault) {
        img.src = frontDefault;
      } else {
        img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="%23f0f0f0" width="200" height="200"/><text x="100" y="100" font-family="Arial" font-size="50" text-anchor="middle" fill="%23ccc">?</text></svg>';
        img.onerror = null;
      }
    }
  }

  formatPokemonId(id: number): string {
    return '#' + String(id).padStart(3, '0');
  }

  capitalize(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  trackByPokemonId(index: number, pokemon: Pokemon): number {
    return pokemon.id;
  }
}
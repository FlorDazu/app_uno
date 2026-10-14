import { Component, OnInit, OnDestroy } from '@angular/core';
import { PokemonService } from './pokemon.service';
import { Pokemon } from './pokemon.interface';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pokemon-detail.component.html',
  styleUrls: ['./pokemon-detail.component.css'],
  providers: [PokemonService]
})
export class PokemonDetailComponent implements OnInit, OnDestroy {
  pokemon: Pokemon | null = null;
  isLoading = true;
  hasError = false;
  errorMessage = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private pokemonService: PokemonService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Read pokemon ID from query params (?id=1)
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const idParam = params['id'];
      
      if (idParam) {
        // Safely convert ID to number
        const id = Number(idParam);
        
        if (isNaN(id) || id <= 0) {
          this.isLoading = false;
          this.hasError = true;
          this.errorMessage = 'ID de Pokémon inválido.';
          return;
        }
        
        this.loadPokemonDetail(id);
      } else {
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = 'No se proporcionó un ID de Pokémon.';
      }
    });
  }

  loadPokemonDetail(id: number): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.pokemon = null;

    this.pokemonService.getPokemonByName(id).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        // CRITICAL: Always stop loading, even if request fails
        this.isLoading = false;
      })
    ).subscribe({
      next: (pokemon: Pokemon | null) => {
        if (pokemon && pokemon.id > 0) {
          this.pokemon = pokemon;
        } else {
          this.hasError = true;
          this.errorMessage = 'No se encontró el Pokémon. Puede que no exista.';
        }
      },
      error: (err) => {
        console.error('Error loading pokemon detail:', err);
        this.hasError = true;
        this.errorMessage = 'No se pudo cargar la información del Pokémon.';
        this.pokemon = null;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  retry(): void {
    // Re-trigger loading from current params
    const idParam = this.route.snapshot.queryParamMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      if (!isNaN(id) && id > 0) {
        this.loadPokemonDetail(id);
      }
    } else {
      this.goBack();
    }
  }

  getTypeColor(type: string): string {
    const typeColors: Record<string, string> = {
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
    return typeColors[type] || '#777';
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
        img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect fill="%23f0f0f0" width="300" height="300"/><text x="150" y="150" font-family="Arial" font-size="60" text-anchor="middle" fill="%23ccc">?</text></svg>';
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
}
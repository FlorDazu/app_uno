import { Routes } from '@angular/router';
import { PokemonListComponent } from './pokemon/pokemon-list.component';
import { PokemonDetailComponent } from './pokemon/pokemon-detail.component';

export const routes: Routes = [
  {
    path: '',
    component: PokemonListComponent,
    pathMatch: 'full'
  },
  {
    path: 'pokemon',
    component: PokemonDetailComponent,
    pathMatch: 'full'
  }
];
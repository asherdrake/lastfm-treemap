import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DatasetComponent } from './dataset/dataset.component';
import { InteractiveComponent } from './interactive/interactive.component';
import { HomeComponent } from './home/home.component';
import { LightweightComponent } from './lightweight/lightweight.component';
import { InteractiveModule } from './interactive/interactive.module';

const routes: Routes = [
  { path: '', component: HomeComponent }, // Home route
  { path: 'dataset', component: DatasetComponent },
  {
    path: 'interactive',
    loadChildren: () => import('./interactive/interactive.module').then(m => m.InteractiveModule)
  },
  {
    path: 'lightweight',
    loadChildren: () => import('./lightweight/lightweight.module').then(m => m.LightweightModule)
  },
  { path: '**', redirectTo: '', pathMatch: 'full' } // Wildcard route for 404
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

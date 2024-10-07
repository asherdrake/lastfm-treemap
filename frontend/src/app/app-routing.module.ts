  import { NgModule } from '@angular/core';
  import { RouterModule, Routes } from '@angular/router';
  import { DatasetComponent } from './dataset/dataset.component';
  import { InteractiveComponent } from './interactive/interactive.component';
  import { HomeComponent } from './home/home.component';
import { LightweightComponent } from './lightweight/lightweight.component';

  const routes: Routes = [
    { path: '', component: HomeComponent }, // Home route
    { path: 'dataset', component: DatasetComponent },
    { path: 'interactive', component: InteractiveComponent },
    { path: 'lightweight', component: LightweightComponent },
    { path: '**', redirectTo: '', pathMatch: 'full' } // Wildcard route for 404
  ];

  @NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
  })
  export class AppRoutingModule { }

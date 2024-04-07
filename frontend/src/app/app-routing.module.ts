import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TreemapComponent } from './treemap/treemap.component';
import { LoadingComponent } from './loading/loading.component';
import { DatasetComponent } from './dataset/dataset.component';
import { AppComponent } from './app.component';

const routes: Routes = [
  {
    path: 'home',
    component: AppComponent,
    children: [
      { path: 'treemap', component: TreemapComponent},
      { path: 'loading', component: LoadingComponent},
      { path: 'dataset', component: DatasetComponent},
    ]
  }
  
  //{ path: '', redirectTo: '/parent/', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

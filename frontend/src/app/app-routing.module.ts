import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TreemapComponent } from './charts/treemap/treemap.component';
import { LoadingComponent } from './loading/loading.component';

const routes: Routes = [
  { path: 'treemap', component: TreemapComponent},
  { path: 'loading', component: LoadingComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

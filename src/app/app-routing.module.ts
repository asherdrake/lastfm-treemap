import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChartComponent } from './charts/chart-component/chart.component';
import { TreemapComponent } from './charts/treemap/treemap.component';

const routes: Routes = [
  { path: 'charts', component: ChartComponent },
  { path: 'treemap', component: TreemapComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

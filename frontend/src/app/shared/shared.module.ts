import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingComponent } from './loading/loading.component';
import { TreemapComponent } from './treemap/treemap.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    LoadingComponent,
    TreemapComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    LoadingComponent,
    TreemapComponent,
    CommonModule,
  ]
})
export class SharedModule { }

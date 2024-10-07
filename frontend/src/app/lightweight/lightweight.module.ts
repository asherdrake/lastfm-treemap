import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LightweightComponent } from './lightweight.component';
import { LoadingLightweightComponent } from '../loading-lightweight/loading-lightweight.component';
import { TreemapLightweightComponent } from '../treemap-lightweight/treemap-lightweight.component';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    LightweightComponent,
    LoadingLightweightComponent,
    TreemapLightweightComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
  ],
  exports: [
    LightweightComponent
  ]
})
export class LightweightModule { }

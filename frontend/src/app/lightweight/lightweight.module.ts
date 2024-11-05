import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { LightweightComponent } from './lightweight.component';
import { LoadingLightweightComponent } from '../loading-lightweight/loading-lightweight.component';
import { TreemapComponent } from '../shared/treemap/treemap.component';
import { FormsModule } from '@angular/forms';
import { LightweightRoutingModule } from './lightweight-routing.module';



@NgModule({
  declarations: [
    LightweightComponent,
    LoadingLightweightComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    LightweightRoutingModule
  ],
  exports: [
    LightweightComponent
  ]
})
export class LightweightModule { }

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LightweightComponent } from './lightweight.component';

const routes: Routes = [
    { path: '', component: LightweightComponent }  // Default route within the module
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class LightweightRoutingModule { }

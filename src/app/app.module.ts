import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ChartComponent } from './charts/chart-component/chart.component';
import { MessagesComponent } from './messages/messages.component';
import { StoreModule } from '@ngrx/store';
import { ChartLoaderDirectiveDirective } from './chart-loader-directive.directive';
import { TreemapComponent } from './charts/treemap/treemap.component';
import { LoadingComponent } from './loading/loading.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    ChartComponent,
    MessagesComponent,
    ChartLoaderDirectiveDirective,
    TreemapComponent,
    LoadingComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    StoreModule.forRoot({}, {})
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

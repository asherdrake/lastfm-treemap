import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingLightweightComponent } from './loading-lightweight.component';

describe('LoadingLightweightComponent', () => {
  let component: LoadingLightweightComponent;
  let fixture: ComponentFixture<LoadingLightweightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingLightweightComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoadingLightweightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

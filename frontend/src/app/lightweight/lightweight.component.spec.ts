import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LightweightComponent } from './lightweight.component';

describe('LightweightComponent', () => {
  let component: LightweightComponent;
  let fixture: ComponentFixture<LightweightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LightweightComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LightweightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

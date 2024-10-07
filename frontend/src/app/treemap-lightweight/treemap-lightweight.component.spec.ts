import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreemapLightweightComponent } from './treemap-lightweight.component';

describe('TreemapLightweightComponent', () => {
  let component: TreemapLightweightComponent;
  let fixture: ComponentFixture<TreemapLightweightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreemapLightweightComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreemapLightweightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

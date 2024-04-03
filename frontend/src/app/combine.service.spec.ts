import { TestBed } from '@angular/core/testing';

import { CombineService } from './combine.service';

describe('CombineService', () => {
  let service: CombineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CombineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

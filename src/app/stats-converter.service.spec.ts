import { TestBed } from '@angular/core/testing';

import { StatsConverterService } from './stats-converter.service';

describe('StatsConverterService', () => {
  let service: StatsConverterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatsConverterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

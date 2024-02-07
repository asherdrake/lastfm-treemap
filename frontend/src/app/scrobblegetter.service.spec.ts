import { TestBed } from '@angular/core/testing';

import { ScrobbleGetterService } from './scrobblegetter.service';

describe('ScrobbleGetterService', () => {
  let service: ScrobbleGetterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScrobbleGetterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

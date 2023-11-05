import { TestBed } from '@angular/core/testing';

import { ScrobbleStorageService } from './scrobble-storage.service';

describe('ScrobbleStorageService', () => {
  let service: ScrobbleStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScrobbleStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

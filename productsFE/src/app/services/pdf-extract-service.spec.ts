import { TestBed } from '@angular/core/testing';

import { PdfExtractService } from './pdf-extract-service';

describe('PdfExtractService', () => {
  let service: PdfExtractService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfExtractService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

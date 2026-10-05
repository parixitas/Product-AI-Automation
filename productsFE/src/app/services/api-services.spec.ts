import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ApiServices } from './api-services';

describe('ApiServices', () => {
  let service: ApiServices;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiServices);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('posts product dossiers to the bulk endpoint', () => {
    const products = [{ name: 'Product 1' }];

    service.addProducts(products).subscribe();

    const request = httpTestingController.expectOne(
      `${service.apiUrl}Product/bulk`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ dossiers: products });
    request.flush([]);
  });

  it('gets products from the product list endpoint', () => {
    service.getAllProductsList().subscribe();

    const request = httpTestingController.expectOne(
      `${service.apiUrl}Product/GetAllProductsList`,
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});

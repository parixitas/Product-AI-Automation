import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CreateProductDto, ProductDto } from '../models/product-chat';

@Injectable({
  providedIn: 'root',
})
export class ApiServices {
  readonly apiUrl = ApiServices.normalizeBaseUrl(environment.backedApi);

  constructor(private http: HttpClient) {}

  private static normalizeBaseUrl(url: string): string {
    if (!url) return '';
    return url.endsWith('/') ? url : url + '/';
  }

  /** POST api/Product — single product */
  addProduct(product: CreateProductDto): Observable<ProductDto> {
    return this.http.post<ProductDto>(this.apiUrl + 'Product', product);
  }

  /**
   * POST api/Product/bulk
   * Backend contract (swagger): BulkCreateProductDto { dossiers: CreateProductDto[] }
   * NOTE: wrapper key is `dossiers` even for products — do not rename to `products`.
   */
  addProducts(products: CreateProductDto[]): Observable<ProductDto[]> {
    return this.http.post<ProductDto[]>(this.apiUrl + 'Product/bulk', {
      dossiers: products,
    });
  }

  /**
   * GET api/Product/GetAllProductsList → ProductDto[]
   * Normalises both raw-array and wrapped ({ data / products / items / dossiers }) responses.
   */
  getAllProductsList(): Observable<ProductDto[]> {
    return this.http.get<any>(this.apiUrl + 'Product/GetAllProductsList').pipe(
      map((response) => {
        const list = Array.isArray(response)
          ? response
          : response?.data ?? response?.products ?? response?.items ?? response?.dossiers ?? [];
        return Array.isArray(list) ? (list as ProductDto[]) : [];
      })
    );
  }
}

import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {Product} from "../../model/product";
import {ProductRequestDto, ProductResponseVo} from "../../model/api";

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  constructor(private httpClient: HttpClient) {
  }

  getProducts(): Observable<Array<ProductResponseVo>> {
    return this.httpClient.get<Array<ProductResponseVo>>('/api/product');
  }

  createProduct(product: ProductRequestDto | Product): Observable<ProductResponseVo> {
    return this.httpClient.post<ProductResponseVo>('/api/product', product);
  }

  updateProduct(productId: string, product: ProductRequestDto | Product): Observable<ProductResponseVo> {
    return this.httpClient.put<ProductResponseVo>('/api/product', {...product, id: productId});
  }
}

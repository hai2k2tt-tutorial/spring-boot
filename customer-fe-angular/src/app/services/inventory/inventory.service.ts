import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {
  AttributeRequestDto,
  AttributeResponseVo,
  InventoryCheckResponseVo,
  SkuRequestDto,
  SkuResponseVo,
  UUID
} from "../../model/api";

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  constructor(private httpClient: HttpClient) {
  }

  createAttribute(attribute: AttributeRequestDto): Observable<AttributeResponseVo> {
    return this.httpClient.post<AttributeResponseVo>('/api/inventory/attributes', attribute);
  }

  getAttributes(productId: UUID): Observable<Array<AttributeResponseVo>> {
    return this.httpClient.get<Array<AttributeResponseVo>>('/api/inventory/attributes', {params: {productId}});
  }

  createSku(sku: SkuRequestDto): Observable<SkuResponseVo> {
    return this.httpClient.post<SkuResponseVo>('/api/inventory/skus', sku);
  }

  getSkus(productId: UUID): Observable<Array<SkuResponseVo>> {
    return this.httpClient.get<Array<SkuResponseVo>>('/api/inventory/skus', {params: {productId}});
  }

  checkStock(skuCode: string, quantity: number): Observable<InventoryCheckResponseVo> {
    return this.httpClient.get<InventoryCheckResponseVo>('/api/inventory/stock-check', {
      params: {skuCode, quantity}
    });
  }
}

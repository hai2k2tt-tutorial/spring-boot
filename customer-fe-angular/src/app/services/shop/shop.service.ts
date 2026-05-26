import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {
  ShopCreateRequestDto,
  ShopResponseVo,
  ShopStatusUpdateRequestDto,
  ShopWalletUpdateRequestDto,
  UUID
} from "../../model/api";

@Injectable({
  providedIn: 'root'
})
export class ShopService {

  constructor(private httpClient: HttpClient) {
  }

  createShop(shop: ShopCreateRequestDto): Observable<ShopResponseVo> {
    return this.httpClient.post<ShopResponseVo>('/api/shops', shop);
  }

  updateShopStatus(shopId: UUID, status: ShopStatusUpdateRequestDto): Observable<ShopResponseVo> {
    return this.httpClient.patch<ShopResponseVo>(`/api/shops/${shopId}/status`, status);
  }

  updateShopWallet(shopId: UUID, wallet: ShopWalletUpdateRequestDto): Observable<ShopResponseVo> {
    return this.httpClient.patch<ShopResponseVo>(`/api/shops/${shopId}/wallet`, wallet);
  }

  getShops(): Observable<Array<ShopResponseVo>> {
    return this.httpClient.get<Array<ShopResponseVo>>('/api/shops');
  }

  getShop(shopId: UUID): Observable<ShopResponseVo> {
    return this.httpClient.get<ShopResponseVo>(`/api/shops/${shopId}`);
  }
}

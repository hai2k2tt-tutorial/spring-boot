import { Injectable } from '@angular/core';
import {Observable} from "rxjs";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {Order} from "../../model/order";
import {OrderCreateRequestDto, OrderResponseVo, UUID} from "../../model/api";

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  constructor(private httpClient: HttpClient) {
  }

  placeOrder(order: OrderCreateRequestDto): Observable<OrderResponseVo> {
    return this.httpClient.post<OrderResponseVo>('/api/order', order);
  }

  getOrders(customerId?: UUID): Observable<Array<OrderResponseVo>> {
    const options = customerId ? {params: {customerId}} : {};
    return this.httpClient.get<Array<OrderResponseVo>>('/api/order', options);
  }

  orderProduct(order: Order): Observable<OrderResponseVo> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
    };
    return this.httpClient.post<OrderResponseVo>('/api/order', order, httpOptions);
  }
}

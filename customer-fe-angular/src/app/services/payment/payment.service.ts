import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {
  PaymentCreateRequestDto,
  PaymentHistoryResponseVo,
  PaymentResponseVo,
  PaymentStatusUpdateRequestDto,
  UUID
} from "../../model/api";

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  constructor(private httpClient: HttpClient) {
  }

  createPayment(payment: PaymentCreateRequestDto): Observable<PaymentResponseVo> {
    return this.httpClient.post<PaymentResponseVo>('/api/payments', payment);
  }

  updatePaymentStatus(paymentId: UUID, status: PaymentStatusUpdateRequestDto): Observable<PaymentResponseVo> {
    return this.httpClient.patch<PaymentResponseVo>(`/api/payments/${paymentId}/status`, status);
  }

  getPayments(filters?: { customerId?: UUID; orderId?: UUID }): Observable<Array<PaymentResponseVo>> {
    return this.httpClient.get<Array<PaymentResponseVo>>('/api/payments', {params: filters ?? {}});
  }

  getPaymentHistory(paymentId: UUID): Observable<Array<PaymentHistoryResponseVo>> {
    return this.httpClient.get<Array<PaymentHistoryResponseVo>>(`/api/payments/${paymentId}/history`);
  }
}

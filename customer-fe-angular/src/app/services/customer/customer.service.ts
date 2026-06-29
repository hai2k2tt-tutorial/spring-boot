import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {
  CustomerCreateRequestDto,
  CustomerResponseVo,
  CustomerStatusUpdateRequestDto,
  UUID
} from "../../model/api";

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  constructor(private httpClient: HttpClient) {
  }

  createCustomer(customer: CustomerCreateRequestDto): Observable<CustomerResponseVo> {
    return this.httpClient.post<CustomerResponseVo>('/api/customers', customer);
  }

  updateCustomerStatus(customerId: UUID, status: CustomerStatusUpdateRequestDto): Observable<CustomerResponseVo> {
    return this.httpClient.patch<CustomerResponseVo>(`/api/customers/${customerId}/status`, status);
  }

  getCustomers(): Observable<Array<CustomerResponseVo>> {
    return this.httpClient.get<Array<CustomerResponseVo>>('/api/customers');
  }

  getCustomer(customerId: UUID): Observable<CustomerResponseVo> {
    return this.httpClient.get<CustomerResponseVo>(`/api/customers/${customerId}`);
  }
}

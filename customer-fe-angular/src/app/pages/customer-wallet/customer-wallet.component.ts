import {Component} from '@angular/core';
import {NgFor, NgIf} from "@angular/common";
import {StorefrontOrder, WalletEntry} from "../../model/customer-store";

@Component({
  selector: 'app-customer-wallet',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './customer-wallet.component.html',
  styleUrl: './customer-wallet.component.css'
})
export class CustomerWalletComponent {
  walletBalance = 320;
  currency = 'USD';

  paymentEntries: WalletEntry[] = [
    {method: 'CARD', status: 'PENDING', amount: 258, createdAt: '2026-05-16 10:15 UTC'},
    {method: 'BALANCE', status: 'SUCCESS', amount: 74, createdAt: '2026-05-15 07:48 UTC'},
    {method: 'MANUAL', status: 'FAILED', amount: 96, createdAt: '2026-05-14 14:31 UTC'}
  ];

  recentOrders: StorefrontOrder[] = [
    {orderNumber: 'ORD-240901', status: 'PENDING', totalAmount: 258, createdAt: '2026-05-16 10:14 UTC', itemSummary: '2 shell variants'},
    {orderNumber: 'ORD-240880', status: 'PAID', totalAmount: 96, createdAt: '2026-05-13 08:20 UTC', itemSummary: '1 daypack'},
  ];
}

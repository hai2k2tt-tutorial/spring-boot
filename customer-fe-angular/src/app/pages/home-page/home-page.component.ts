import {Component} from '@angular/core';
import {NgFor, NgIf} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {StorefrontProduct} from "../../model/customer-store";

@Component({
  selector: 'app-homepage',
  templateUrl: './home-page.component.html',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf
  ],
  styleUrl: './home-page.component.css'
})
export class HomePageComponent {
  products: StorefrontProduct[] = [
    {
      id: 'prod-1',
      name: 'Meridian Trail Shell',
      category: 'Outerwear',
      description: 'Weatherproof commuter shell with removable liner and reflective trim.',
      price: 129,
      imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
      shopName: 'Northline Goods',
      availableStock: 84
    },
    {
      id: 'prod-2',
      name: 'Northline Daypack',
      category: 'Bags',
      description: '28L backpack with laptop sleeve, bottle pockets, and modular straps.',
      price: 96,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
      shopName: 'Northline Goods',
      availableStock: 53
    },
    {
      id: 'prod-3',
      name: 'Altitude Knit Runner',
      category: 'Footwear',
      description: 'Lightweight knit sneaker with dual-density sole and neutral palette.',
      price: 142,
      imageUrl: 'https://images.unsplash.com/photo-1543508282-6319a3e2621f?auto=format&fit=crop&w=900&q=80',
      shopName: 'House Meridian',
      availableStock: 67
    }
  ];

  cartMessage = '';

  addToBag(product: StorefrontProduct, quantityValue: string) {
    const quantity = Number(quantityValue);
    if (!quantity || quantity < 1) {
      this.cartMessage = 'Enter a quantity greater than zero before adding to bag.';
      return;
    }
    this.cartMessage = `${quantity} × ${product.name} added to bag preview.`;
  }
}

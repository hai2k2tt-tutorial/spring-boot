import {Routes} from '@angular/router';
import {HomePageComponent} from "./pages/home-page/home-page.component";
import {CustomerWalletComponent} from "./pages/customer-wallet/customer-wallet.component";

export const routes: Routes = [
  {path: '', component: HomePageComponent},
  {path: 'wallet', component: CustomerWalletComponent}
];

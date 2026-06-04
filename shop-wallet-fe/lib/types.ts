export type UUID = string;
export type Instant = string;

export interface WalletResponseVo {
  id: UUID;
  ownerType: "CUSTOMER" | "SHOP" | string;
  ownerId: UUID;
  balance: number;
  currency: string;
  updatedAt: Instant;
}

export interface WalletTransactionResponseVo {
  id: UUID;
  walletId: UUID;
  ownerType: "CUSTOMER" | "SHOP" | string;
  ownerId: UUID;
  type: "CREDIT" | "DEBIT" | string;
  amount: number;
  balanceAfter: number;
  currency: string;
  externalRef?: string;
  description?: string;
  createdAt: Instant;
}

export interface WalletMoneyRequestDto {
  amount: number;
  currency?: string;
  externalRef?: string;
  description?: string;
}

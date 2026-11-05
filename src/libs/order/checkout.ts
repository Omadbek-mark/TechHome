import { createHash } from 'crypto';
import { HttpError } from '../security/http';
import { OrderStatus } from '../enums/order.enum';

export interface CheckoutItem { productId: string; itemQuantity: number; }
export const MAX_QUANTITY = 99;
export const MAX_CART_ITEMS = 50;
export const MAX_MONEY_CENTS = 1_000_000_000;

export function checkoutItems(input: unknown): CheckoutItem[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_CART_ITEMS) {
    throw new HttpError(400, 'INVALID_CART', 'Please check the items in your cart.');
  }
  const items = new Map<string, number>();
  for (const value of input) {
    if (!value || typeof value.productId !== 'string' || !/^[a-f0-9]{24}$/i.test(value.productId) ||
        !Number.isSafeInteger(value.itemQuantity) || value.itemQuantity < 1 || value.itemQuantity > MAX_QUANTITY) {
      throw new HttpError(400, 'INVALID_CART', 'Please check the items and quantities in your cart.');
    }
    const id = value.productId.toLowerCase();
    const quantity = (items.get(id) ?? 0) + value.itemQuantity;
    if (quantity > MAX_QUANTITY) throw new HttpError(400, 'INVALID_CART', 'The quantity limit for an item is 99.');
    items.set(id, quantity);
  }
  return [...items].sort(([a], [b]) => a.localeCompare(b)).map(([productId, itemQuantity]) => ({ productId, itemQuantity }));
}

export function checkoutKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$/.test(value)) {
    throw new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Please retry checkout from your cart.');
  }
  return value;
}
export function checkoutHash(items: CheckoutItem[]): string {
  return createHash('sha256').update(JSON.stringify(items)).digest('hex');
}
export function priceCents(price: number): number {
  const cents = Math.round(price * 100);
  if (!Number.isFinite(price) || price < 0 || !Number.isSafeInteger(cents) || cents > MAX_MONEY_CENTS || Math.abs(cents / 100 - price) > 1e-8) {
    throw new HttpError(409, 'CATALOG_PRICE_INVALID', 'A product price is unavailable. Please refresh the catalog.');
  }
  return cents;
}
export function orderInquiry(input: { page?: unknown; limit?: unknown; orderStatus?: unknown }) {
  const page = Number(input.page ?? 1), limit = Number(input.limit ?? 5);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50 ||
      !Object.values(OrderStatus).includes(input.orderStatus as OrderStatus)) {
    throw new HttpError(400, 'INVALID_ORDER_FILTER', 'Please check the order filter.');
  }
  return { page, limit, orderStatus: input.orderStatus as OrderStatus };
}

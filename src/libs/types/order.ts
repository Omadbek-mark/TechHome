import { Types } from "mongoose";
import { OrderStatus } from "../enums/order.enum";
import { Product } from "./product";

export interface OrderItem {
  _id: Types.ObjectId;
  itemQuantity: number;
  itemPrice: number;
  itemPriceCents?: number;
  productName?: string;
  productImage?: string;
  installmentMonths?: number;
  installmentMonthly?: number;
  installmentLastMonth?: number;
  orderId: Types.ObjectId;
  productId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  _id: Types.ObjectId;
  orderTotal: number;
  orderDelivery: number;
  orderSubtotalCents?: number;
  orderDeliveryCents?: number;
  orderTotalCents?: number;
  currency?: 'USD';
  paymentMode?: 'DEMO';
  workflowVersion?: number;
  stockReserved?: boolean;
  idempotencyKey?: string;
  checkoutHash?: string;
  orderStatus: OrderStatus;
  memberId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  /** from Aggregations */
  orderItems: OrderItem[];
  productData: Product[];
}

export interface OrderItemInput {
  itemQuantity: number;
  productId: string;
  /** Accepted only for old clients and ignored by checkout. */
  itemPrice?: number;
}

export interface OrderInquiry {
  page: number;
  limit: number;
  orderStatus: OrderStatus;
}

export interface OrderUpdateInput {
  orderId: string;
  orderStatus: OrderStatus;
}
/** Persisted order; aggregation joins exist only on list responses. */
export type OrderRecord = Omit<Order, "orderItems" | "productData">;

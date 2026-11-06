import type { OrderItem } from "../libs/types/order";
import mongoose, { Schema } from "mongoose";

const orderItemSchema = new Schema<OrderItem>(
  {
    itemQuantity: {
      type: Number,
      required: true,
      min: 1, max: 99, validate: Number.isSafeInteger,
    },

    itemPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    itemPriceCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    productName: { type: String },
    productImage: { type: String },
    installmentMonths: { type: Number, enum: [0, 6, 12, 24] },
    installmentMonthly: { type: Number, min: 0 },
    installmentLastMonth: { type: Number, min: 0 },

    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
  },
  { timestamps: true, collection: "orderItems" }
);

orderItemSchema.index({ orderId: 1 });
export default mongoose.model<OrderItem>("OrderItem", orderItemSchema);
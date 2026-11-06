import type { OrderRecord } from "../libs/types/order";
import mongoose, { Schema } from "mongoose";
import { OrderStatus } from "../libs/enums/order.enum";

const orderSchema = new Schema<OrderRecord>(
  {
    orderTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    orderDelivery: {
      type: Number,
      required: true,
      min: 0,
    },

    orderSubtotalCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    orderDeliveryCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    orderTotalCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    currency: { type: String, enum: ['USD'] },
    paymentMode: { type: String, enum: ['DEMO'] },
    workflowVersion: { type: Number },
    stockReserved: { type: Boolean },
    idempotencyKey: { type: String },
    checkoutHash: { type: String },
    orderStatus: {
      type: String,
      enum: OrderStatus,
      default: OrderStatus.PAUSE
    },

    memberId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Member",
    },
  }, 
  { timestamps: true }
);

orderSchema.index({ memberId: 1, idempotencyKey: 1 }, {
  unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } },
});
orderSchema.index({ memberId: 1, orderStatus: 1, updatedAt: -1 });
export default mongoose.model<OrderRecord>("Order", orderSchema);
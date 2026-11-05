import mongoose, { ClientSession, Types } from 'mongoose';
import { Member } from '../libs/types/member';
import { Order, OrderRecord, OrderInquiry, OrderUpdateInput, OrderItem } from '../libs/types/order';
import OrderModel from '../schema/Order.model';
import OrderItemModel from '../schema/OrderItem.model';
import ProductModel from '../schema/Product.model';
import MemberModel from '../schema/Member.model';
import { OrderStatus } from '../libs/enums/order.enum';
import { MemberStatus, MemberType } from '../libs/enums/member.enum';
import { ProductStatus } from '../libs/enums/product.enum';
import { checkoutItems, checkoutKey, checkoutHash, MAX_MONEY_CENTS, priceCents, orderInquiry } from '../libs/order/checkout';
import { HttpError } from '../libs/security/http';

export function orderResponse(order: OrderRecord | Order) {
  const raw = (order as { toObject?: () => OrderRecord }).toObject?.() ?? order;
  const { idempotencyKey, checkoutHash: hash, workflowVersion, stockReserved, ...data } = raw;
  return { ...data, readOnly: workflowVersion !== 1 };
}

class OrderService {
  private readonly orderModel = OrderModel;
  private readonly orderItemModel = OrderItemModel;
  private readonly productModel = ProductModel;
  private readonly memberModel = MemberModel;

  private async transaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => { result = await work(session); }, {
        readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary', maxCommitTimeMS: 10000,
      });
      if (result === undefined) throw new Error('Transaction returned no result');
      return result;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 20) {
        throw new HttpError(503, 'TRANSACTIONS_REQUIRED', 'Ordering is temporarily unavailable. Please try again later.');
      }
      throw error;
    } finally { await session.endSession(); }
  }

  private async currentMember(member: Member, session: ClientSession) {
    const current = await this.memberModel.findOne({ _id: member._id, memberStatus: MemberStatus.ACTIVE }).session(session).lean().exec();
    if (!current || (current.authVersion ?? 0) !== (member.authVersion ?? 0)) throw new HttpError(401, 'UNAUTHENTICATED', 'Please log in again.');
    return current;
  }

  private replay(order: OrderRecord, hash: string): OrderRecord {
    if (order.checkoutHash !== hash) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'This checkout has already been used for a different cart. Please refresh your cart.');
    return order;
  }

  public async createOrder(member: Member, input: unknown, keyInput?: string): Promise<OrderRecord> {
    const items = checkoutItems(input), key = checkoutKey(keyInput), hash = checkoutHash(items);
    const memberId = new Types.ObjectId(String(member._id));
    // Fail closed if a deployment has not prepared the required unique index.
    await this.orderModel.init();
    const indexes = await this.orderModel.collection.indexes();
    if (!indexes.some(index => index.unique === true && Object.keys(index.key).length === 2 && index.key.memberId === 1 && index.key.idempotencyKey === 1 && index.partialFilterExpression?.idempotencyKey?.$type === 'string')) {
      throw new HttpError(503, 'CHECKOUT_UNAVAILABLE', 'Ordering is temporarily unavailable. Please try again later.');
    }
    try {
      return await this.transaction(async (session) => {
        await this.currentMember(member, session);
        const existing = await this.orderModel.findOne({ memberId, idempotencyKey: key }).session(session).lean().exec();
        if (existing) return this.replay(existing, hash);
        const snapshots: Omit<OrderItem, '_id' | 'orderId' | 'createdAt' | 'updatedAt'>[] = [];
        let subtotal = 0;
        // Sequential writes inside the transaction, in canonical product order.
        for (const item of items) {
          const product = await this.productModel.findOneAndUpdate({
            _id: new Types.ObjectId(item.productId), productStatus: ProductStatus.PROCESS,
            productLeftCount: { $gte: item.itemQuantity },
          }, { $inc: { productLeftCount: -item.itemQuantity } }, { session, new: true, runValidators: true }).lean().exec();
          if (!product) throw new HttpError(409, 'OUT_OF_STOCK', 'An item is unavailable or its quantity exceeds the stock. Please update your cart.');
          if (!Number.isSafeInteger(product.productLeftCount) || product.productLeftCount < 0) throw new HttpError(409, 'OUT_OF_STOCK', 'Product stock is unavailable.');
          const cents = priceCents(product.productPrice);
          subtotal += cents * item.itemQuantity;
          if (!Number.isSafeInteger(subtotal) || subtotal > MAX_MONEY_CENTS) throw new HttpError(400, 'INVALID_CART', 'The order total exceeds the checkout limit.');
          const months = product.installmentMonths ?? 0;
          if (![0, 6, 12, 24].includes(months)) throw new HttpError(409, 'CATALOG_PRICE_INVALID', 'Installment information is unavailable.');
          const monthly = months ? Math.floor(cents / months) : undefined;
          snapshots.push({ productId: product._id, itemQuantity: item.itemQuantity, itemPrice: cents / 100, itemPriceCents: cents,
            productName: product.productName, productImage: product.productImages[0], installmentMonths: months,
            installmentMonthly: monthly === undefined ? undefined : monthly / 100,
            installmentLastMonth: monthly === undefined ? undefined : (cents - monthly * (months - 1)) / 100 });
        }
        const delivery = subtotal < 10000 ? 500 : 0;
        const [created] = await this.orderModel.create([{
          memberId, orderStatus: OrderStatus.PAUSE, orderTotal: (subtotal + delivery) / 100, orderDelivery: delivery / 100,
          orderSubtotalCents: subtotal, orderDeliveryCents: delivery, orderTotalCents: subtotal + delivery,
          currency: 'USD', paymentMode: 'DEMO', workflowVersion: 1, stockReserved: true, idempotencyKey: key, checkoutHash: hash,
        }], { session });
        await this.orderItemModel.insertMany(snapshots.map((item) => ({ ...item, orderId: created._id })), { session });
        return created.toObject();
      });
    } catch (error) {
      // A concurrent identical request can reach the unique index before replay lookup.
      if (error instanceof Error && 'code' in error && error.code === 11000) {
        const existing = await this.orderModel.findOne({ memberId, idempotencyKey: key }).lean().exec();
        if (existing) return this.replay(existing, hash);
      }
      throw error;
    }
  }

  public async getMyOrders(member: Member, input: OrderInquiry): Promise<Order[]> {
    const inquiry = orderInquiry(input);
    return this.orderModel.aggregate<Order>([
      { $match: { memberId: new Types.ObjectId(String(member._id)), orderStatus: inquiry.orderStatus } },
      { $sort: { updatedAt: -1, _id: -1 } }, { $skip: (inquiry.page - 1) * inquiry.limit }, { $limit: inquiry.limit },
      { $lookup: { from: 'orderItems', localField: '_id', foreignField: 'orderId', as: 'orderItems' } },
      { $lookup: { from: 'products', localField: 'orderItems.productId', foreignField: '_id', as: 'productData' } },
      { $project: { idempotencyKey: 0, checkoutHash: 0 } },
    ]).exec();
  }

  public async updateOrder(member: Member, input: OrderUpdateInput): Promise<OrderRecord> {
    if (!input || typeof input.orderId !== 'string' || !/^[a-f0-9]{24}$/i.test(input.orderId) ||
        ![OrderStatus.PROCESS, OrderStatus.FINISH, OrderStatus.DELETE].includes(input.orderStatus)) {
      throw new HttpError(400, 'INVALID_TRANSITION', 'Please check the requested order action.');
    }
    return this.transaction(async (session) => {
      const currentMember = await this.currentMember(member, session);
      const filter = { _id: new Types.ObjectId(input.orderId), memberId: new Types.ObjectId(String(member._id)) };
      const order = await this.orderModel.findOne(filter).session(session).lean().exec();
      if (!order) throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found.');
      if (order.workflowVersion !== 1 || order.paymentMode !== 'DEMO') {
        throw new HttpError(409, 'HISTORICAL_ORDER_READ_ONLY', 'This historical order can be viewed only.');
      }
      if (order.orderStatus === input.orderStatus) return order;
      const allowed = order.orderStatus === OrderStatus.PAUSE
        ? [OrderStatus.PROCESS, OrderStatus.DELETE] : order.orderStatus === OrderStatus.PROCESS ? [OrderStatus.FINISH] : [];
      if (!allowed.includes(input.orderStatus)) throw new HttpError(409, 'INVALID_TRANSITION', 'The order has changed. Please refresh your orders.');
      if (!order.stockReserved) throw new HttpError(409, 'INVENTORY_CONFLICT', 'This order cannot be changed. Please contact support.');
      const changed = await this.orderModel.findOneAndUpdate({ ...filter, orderStatus: order.orderStatus, stockReserved: true },
        { $set: { orderStatus: input.orderStatus, ...(input.orderStatus === OrderStatus.DELETE ? { stockReserved: false } : {}) } },
        { new: true, session, runValidators: true }).lean().exec();
      if (!changed) throw new HttpError(409, 'INVALID_TRANSITION', 'The order has changed. Please refresh your orders.');
      if (input.orderStatus === OrderStatus.DELETE) {
        const items = await this.orderItemModel.find({ orderId: order._id }).session(session).lean().exec();
        if (!items.length) throw new HttpError(409, 'INVENTORY_CONFLICT', 'Order items are unavailable. Please contact support.');
        for (const item of items) {
          const restored = await this.productModel.updateOne({ _id: item.productId }, { $inc: { productLeftCount: item.itemQuantity } }, { session }).exec();
          if (restored.matchedCount !== 1) throw new HttpError(409, 'INVENTORY_CONFLICT', 'An order item is unavailable. Please contact support.');
        }
      }
      if (input.orderStatus === OrderStatus.PROCESS && currentMember.memberType === MemberType.USER) {
        await this.memberModel.updateOne({ _id: currentMember._id }, { $inc: { memberPoints: 1 } }, { session }).exec();
      }
      return changed;
    });
  }
}
export default OrderService;

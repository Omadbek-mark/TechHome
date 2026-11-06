import { Response } from 'express';
import { T } from '../libs/types/common';
import { ExtendedRequest } from '../libs/types/member';
import OrderService, { orderResponse } from '../models/Order.service';
import { orderInquiry } from '../libs/order/checkout';
import { sendError } from '../libs/security/http';

const service = new OrderService();
const controller: T = {};
controller.createOrder = async (req: ExtendedRequest, res: Response) => {
  try {
    const result = await service.createOrder(req.member, req.body, req.get('Idempotency-Key'));
    res.set('Cache-Control', 'no-store').status(201).json(orderResponse(result));
  } catch (error) { sendError(res, error); }
};
controller.getMyOrders = async (req: ExtendedRequest, res: Response) => {
  try {
    const result = await service.getMyOrders(req.member, orderInquiry(req.query));
    res.set('Cache-Control', 'no-store').json(result.map(orderResponse));
  } catch (error) { sendError(res, error); }
};
controller.updateOrder = async (req: ExtendedRequest, res: Response) => {
  try {
    const result = await service.updateOrder(req.member, req.body);
    res.set('Cache-Control', 'no-store').json(orderResponse(result));
  } catch (error) { sendError(res, error); }
};
export default controller;

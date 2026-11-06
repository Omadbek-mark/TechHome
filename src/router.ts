import express from "express";
const router = express.Router();
import memberController from "./controllers/member.controller";
import uploader from "./libs/utils/uploader";
import productController from "./controllers/product.controller";
import orderController from "./controllers/order.controller";
import { advisorStatus, askAdvisor } from "./controllers/advisor.controller";
import { rateLimit } from "express-rate-limit";

/** Member */
router.get(
  "/member/store",
  memberController.getStore
);
router.post('/member/login', memberController.login);
router.post('/member/signup', memberController.signup);
router.post(
  '/member/logout',
  memberController.logout
);
router.get(
  '/member/detail',
  memberController.verifyAuth,
  memberController.getMemberDetail
);
router.post(
  "/member/update",
  memberController.verifyAuth,
  uploader("members").single("memberImage"),
  memberController.updateMember
);

/** Public advisor: guest CSRF/session rules still apply to POST. */
router.get('/ai/status', advisorStatus);
router.post('/ai/advisor', rateLimit({ windowMs: 60000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { code: 'AI_RATE_LIMITED', message: 'Please wait before asking again.' } }), memberController.retrieveAuth, askAdvisor);

/** Product */
router.get("/product/catalog", productController.getCatalog);
router.get(
  "/product/all",
  productController.getProducts
);
router.get(
  "/product/:id",
  memberController.retrieveAuth,
  productController.getProduct
);

/** Order */
router.post(
  "/order/create",
  memberController.verifyAuth,
  orderController.createOrder
);
router.get(
  "/order/all",
  memberController.verifyAuth,
  orderController.getMyOrders
);
router.post(
  "/order/update", memberController.verifyAuth,
  orderController.updateOrder
);

export default router;


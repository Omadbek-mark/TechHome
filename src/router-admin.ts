import express from "express";
const routerAdmin = express.Router();
import storeController from "./controllers/store.controller";
import productController from "./controllers/product.controller"; 
import  makeUploader from "./libs/utils/uploader";

/** Store */
routerAdmin.get('/', storeController.retrieveStore, storeController.goHome);
routerAdmin
  .get('/login', storeController.retrieveStore, storeController.getLogin)
  .post('/login', storeController.processLogin);
routerAdmin.all('/signup', (_req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Not found.' }));
routerAdmin.post('/logout', storeController.verifyStore, storeController.logout);
routerAdmin.get('/check-me', storeController.verifyStore, storeController.checkAuthSession);

/** Product */
routerAdmin.get(
  '/product/all',
  storeController.verifyStore,
  storeController.getAllProducts
);
routerAdmin.post(
  "/product/create",
  storeController.verifyStore,
  makeUploader("products").array("productImages", 5),
  productController.createNewProduct);
routerAdmin.post(
  "/product/:id",
  storeController.verifyStore,
  productController.updateChosenProduct
);


/** User */
routerAdmin.get('/user/all',
  storeController.verifyStore,
  storeController.getUsers
);
routerAdmin.post('/user/edit',
  storeController.verifyStore,
  storeController.updateChosenUser
);

export default routerAdmin;

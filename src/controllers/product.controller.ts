import {Request, Response} from "express";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";
import ProductService from "../models/Product.service";
import { ProductInput, ProductInquiry } from "../libs/types/product";
import { AdminRequest, ExtendedRequest } from "../libs/types/member";
import { ProductCategory } from "../libs/enums/product.enum";
import { HttpError, sendError } from "../libs/security/http";
import { MemberType } from "../libs/enums/member.enum";

const productService = new ProductService();


const productController: T = {};

/** SPA */
productController.getProducts = async (req: Request, res: Response) => {
  try {
    const result = await productService.getProducts(req.query as unknown as ProductInquiry);
    res.status(200).json(result);
  } catch (error) { sendError(res, error); }
};
productController.getCatalog = async (req: Request, res: Response) => {
  try { res.status(200).json(await productService.getCatalog(req.query)); }
  catch (error) { sendError(res, error); }
};
productController.getProduct = async (req: ExtendedRequest, res: Response) => {
  try { res.status(200).json(await productService.getProduct(req.member?._id ?? null, req.params.id as string)); }
  catch (error) { sendError(res, error); }
};


/** SSR */
productController.getAdminProducts = async (req: ExtendedRequest, res: Response) => {
  try {
    console.log("getAdminProducts");
    if (!req.member || req.member.memberType !== MemberType.STORE)
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED_REQUEST);
 
    const result = await productService.getAllProducts();
 
    res.status(HttpCode.OK).json(result);
  } catch (error) { sendError(res, error); }
};

productController.createNewProduct = async (
  req: AdminRequest,
  res: Response
) => {
  try {
    console.log('createNewProduct');
    if (!req.files?.length)
      throw new HttpError(400, "IMAGE_REQUIRED", "Please select a product image.");

    const data: ProductInput = req.body;
    data.productImages = req.files?.map(ele => {
      return ele.path.replace(/\\/g, "/");
    });

    await productService.createNewProduct(data);
    res.locals.uploadCommitted = true;
    
    res.status(HttpCode.CREATED).json({ created: true });
  } catch (error) { sendError(res, error); }
};

productController.updateChosenProduct = async (req: Request, res: Response) => {
  try {
    console.log('updateChosenProduct');
    const id = req.params.id as string;

    const result = await productService.updateChosenProduct(id, req.body);

    res.status(HttpCode.OK).json({ data: result });
  } catch (error) { sendError(res, error); }
};

export default productController;
import { shapeIntoMongooseObjectId } from "../libs/config";
import { ProductStatus } from "../libs/enums/product.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";
import {
  Product,
  ProductInput,
  ProductInquiry,
  ProductListWithStats,
  ProductUpdateInput,
} from "../libs/types/product";
import ProductModel from "../schema/Product.model";
import { Types } from "mongoose";
import { catalogInquiry, catalogMatch, productFields, productResponse } from "../libs/catalog/product";
import { HttpError } from "../libs/security/http";
import { ProductPage } from "../libs/types/product";
import ViewService from "./View.service";
import { ViewInput } from "../libs/types/view";
import { ViewGroup } from "../libs/enums/view.enum";

const LOW_STOCK_THRESHOLD = 10;

class ProductService { 
  private readonly productModel;
  public viewService;

  constructor() {
    this.productModel = ProductModel;
    this.viewService = new ViewService();
  }

  /** SPA */

  public async getProducts(inquiry: ProductInquiry): Promise<Product[]> {
    const parsed = catalogInquiry(inquiry as unknown as Record<string, unknown>);
    return (await this.productModel.aggregate([
      { $match: catalogMatch(parsed) }, { $sort: this.sort(parsed.order) },
      { $skip: (parsed.page - 1) * parsed.limit }, { $limit: parsed.limit },
    ]).exec()).map(productResponse);
  }

  private sort(order: string): Record<string, 1 | -1> {
    return order === 'productPrice' ? { productPrice: 1, _id: 1 } : order === 'priceDesc' ? { productPrice: -1, _id: 1 } : { [order]: -1, _id: 1 };
  }

  public async getCatalog(input: Record<string, unknown>): Promise<ProductPage> {
    const inquiry = catalogInquiry(input);
    const [result] = await this.productModel.aggregate([
      { $match: catalogMatch(inquiry) },
      { $facet: { items: [{ $sort: this.sort(inquiry.order) }, { $skip: (inquiry.page - 1) * inquiry.limit }, { $limit: inquiry.limit }], total: [{ $count: 'count' }] } },
    ]).exec();
    return { items: (result?.items ?? []).map(productResponse), total: result?.total?.[0]?.count ?? 0, page: inquiry.page, limit: inquiry.limit };
  }

  public async getProduct(
    memberId: Types.ObjectId | null,
    id: string
  ): Promise<Product> {
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new HttpError(400, "INVALID_PRODUCT_ID", "Invalid product ID.");
    const productId = new Types.ObjectId(id);

    let result = await this.productModel
      .findOne({
        _id: productId,
        productStatus: ProductStatus.PROCESS,
      })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    if (memberId) {
      // Check Existence
      const input: ViewInput = {
        memberId: memberId,
        viewRefId: productId,
        viewGroup: ViewGroup.PRODUCT,
      };

      const existView = await this.viewService.checkViewExistence(input);


      if (!existView) {
        // Insert View

        await this.viewService.insertMemberView(input);

        // Increase Counts
        result = await this.productModel
          .findByIdAndUpdate(
            productId,
            { $inc: { productViews: +1 } },
            { new: true },
          )
          .exec();
      }
    }
    
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return productResponse(result);
  }

  /** SSR */
  public async getAllProducts(): Promise<ProductListWithStats> {
    try {
      const products: Product[] = await this.productModel
        .find({})
        .lean<Product[]>()
        .exec();

      const total = products.length;
      const activeCount = products.filter((p) => p.productStatus === ProductStatus.PROCESS).length;
      const pausedCount = products.filter((p) => p.productStatus === ProductStatus.PAUSE).length;
      const deletedCount = products.filter((p) => p.productStatus === ProductStatus.DELETE).length;
      const lowStockCount = products.filter((p) => p.productLeftCount <= LOW_STOCK_THRESHOLD).length;

      return { products: products.map(productResponse), total, activeCount, pausedCount, deletedCount, lowStockCount };
    } catch (err) {
      console.log("Error, model:getAllProducts:", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.NO_DATA_FOUND);
    }
  }


  public async createNewProduct(input: ProductInput): Promise<Product> {
    const { productImages, ...source } = input;
    const fields = productFields(source);
    const clean = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null));
    try { return productResponse(await this.productModel.create({ ...clean, productImages })); }
    catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 11000) throw new HttpError(409, 'PRODUCT_EXISTS', 'A product with this name and energy class already exists.');
      throw new HttpError(400, 'INVALID_PRODUCT', 'Unable to save the product. Please check its fields.');
    }
  }

  public async updateChosenProduct(id: string, input: ProductUpdateInput): Promise<Product> {
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new HttpError(400, 'INVALID_PRODUCT_ID', 'Invalid product ID.');
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await this.productModel.findById(id).lean().exec();
      if (!current) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
      const fields = productFields(input, current);
      const set = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null));
      const unset = Object.fromEntries(Object.entries(fields).filter(([, value]) => value === null).map(([key]) => [key, 1]));
      const result = await this.productModel.findOneAndUpdate({ _id: id, __v: (current as Product & { __v?: number }).__v }, { $set: set, $unset: unset, $inc: { __v: 1 } }, { new: true, runValidators: true }).exec();
      if (result) return productResponse(result);
    }
    throw new HttpError(409, 'PRODUCT_CHANGED', 'The product changed. Please reload and retry.');
  }
}
export default ProductService;

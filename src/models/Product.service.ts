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
import { ObjectId } from "mongoose";
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
    console.log("inquiry:", inquiry);
    const match: T = { productStatus: ProductStatus.PROCESS };

    if (inquiry.productCategory)
      match.productCollection = inquiry.productCategory;
    if (inquiry.search) {
      match.productName = { $regex: new RegExp(inquiry.search, "i") };
    }

    const sort: T =
      inquiry.order === "productPrice"
        ? { [inquiry.order]: 1 }
        : { [inquiry.order]: -1 };
    
    const result = await this.productModel
      .aggregate([
      { $match: match },
      { $sort: sort },
      {$skip: (inquiry.page * 1 - 1) * inquiry.limit},
      { $limit: inquiry.limit * 1},
      ])
      .exec();
    if (!result.length) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return result;
  }

  public async getProduct(
    memberId: ObjectId | null,
    id: string
  ): Promise<Product> {
    const productId = shapeIntoMongooseObjectId(id);

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

      console.log("exist:", !!existView);
      if (!existView) {
        // Insert View
        console.log("PLANNING TO INSERT NEW VIEW");
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
    
    return result;
  }

  /** SSR */

  // public async getAllProducts(
  // ): Promise<Product[]> {
  //   const result = await this.productModel.find().exec();
  //   if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

  //   return result;
  // }

  public async getAllProducts(): Promise<ProductListWithStats> {
    try {
      // Single-store project: no memberId filter needed. If you go multi-store
      // later, add { memberId: storeId } here.
      const products: Product[] = await this.productModel
        .find({})
        .lean<Product[]>()
        .exec();

      const total = products.length;
      const activeCount = products.filter((p) => p.productStatus === ProductStatus.PROCESS).length;
      const pausedCount = products.filter((p) => p.productStatus === ProductStatus.PAUSE).length;
      const deletedCount = products.filter((p) => p.productStatus === ProductStatus.DELETE).length;
      const lowStockCount = products.filter((p) => p.productLeftCount <= LOW_STOCK_THRESHOLD).length;

      return { products, total, activeCount, pausedCount, deletedCount, lowStockCount };
    } catch (err) {
      console.log("Error, model:getAllProducts:", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.NO_DATA_FOUND);
    }
  }


  public async createNewProduct(input: ProductInput): Promise<Product> {
    try {
      const months = Number(input.installmentMonths) || 0;
    input.installmentMonthly = months > 0 ? +(Number(input.productPrice) / months).toFixed(2) : undefined;
      return await this.productModel.create(input);
    } catch (err) {
      console.log("REAL ERROR:", err);
      console.log("Error, model:createNewProduct:", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async updateChosenProduct(
    id: string,
    input: ProductUpdateInput
  ): Promise<Product> {
    id = shapeIntoMongooseObjectId(id);
    const result = await this.productModel.findOneAndUpdate({ _id: id }, input, { new: true })
    .exec();
    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);

    return result;
  }
 }

export default ProductService;

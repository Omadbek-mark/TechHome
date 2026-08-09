import mongoose, { Schema } from "mongoose";
import {
  ProductCategory,
  WarrantyYears,
  ProductStatus,
  InstallmentMonths,
  EnergyClass
} from "../libs/enums/product.enum";

const productSchema = new Schema(
  {
    productStatus: {
      type: String,
      enum: ProductStatus,
      default: ProductStatus.PAUSE
    },

    productCategory: {
      type: String,
      enum: ProductCategory,
      required: true,
    },

    productName: {
      type: String,
      required: true,
    },

    productPrice: {
      type: Number,
      required: true,
    },

    productLeftCount: {
      type: Number,
      required: true,
    },

    warrantyYears: {
      type: Number,
      enum: WarrantyYears,
      default: WarrantyYears.ONE_YEAR,
      required: true,
    },

    installmentMonths: {
      type: Number,
      enum: InstallmentMonths,
      default: InstallmentMonths.CASH_ONLY,
      required: true,
    },

    energyClass: {
      type: String,
      enum: EnergyClass,
      required: true,
    },

    productDesc: {
      type: String,
    },

    productImages: {
      type: [String],
      default: [],
    },

    productViews: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }  // updatedAt, createdAt
);

productSchema.index(
  { productName: 1, energyClass: 1 },
  { unique: true }
);
export default mongoose.model("Product", productSchema);
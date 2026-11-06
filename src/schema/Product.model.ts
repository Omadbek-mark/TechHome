import type { Product } from "../libs/types/product";
import mongoose, { Schema } from "mongoose";
import {
  ProductCategory,
  WarrantyYears,
  ProductStatus,
  InstallmentMonths,
  EnergyClass
} from "../libs/enums/product.enum";

const productSchema = new Schema<Product>(
  {
    productOldPrice: { type: Number, min: 0 },
    installmentLastMonth: { type: Number, min: 0 },
    brand: { type: String, trim: true, maxlength: 80 },
    model: { type: String, trim: true, maxlength: 80 },
    widthCm: { type: Number, min: 0 },
    heightCm: { type: Number, min: 0 },
    depthCm: { type: Number, min: 0 },
    capacityLiters: { type: Number, min: 0 },
    loadKg: { type: Number, min: 0 },
    noiseDb: { type: Number, min: 0 },
    energyKwhPerYear: { type: Number, min: 0 },
    coolingCapacityBtu: { type: Number, min: 0 },
    dustCapacityLiters: { type: Number, min: 0 },
    screenSizeInches: { type: Number, min: 0 },
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
      min: 0,
      validate: (value: number) => Number.isFinite(value) && Math.abs(value - Math.round(value * 100) / 100) < 1e-8,
    },

    productLeftCount: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },

    warrantyYears: {
      type: Number,
      enum: WarrantyYears,
      default: WarrantyYears.ONE_YEAR,
    },

    installmentMonths: {
      type: Number,
      enum: InstallmentMonths,
      default: InstallmentMonths.CASH_ONLY,
      required: true,
    },

    installmentMonthly: {
      type: Number,
    },

    energyClass: {
      type: String,
      enum: EnergyClass,
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
export default mongoose.model<Product>("Product", productSchema);
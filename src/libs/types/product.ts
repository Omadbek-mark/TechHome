import { Types } from "mongoose";
import { ProductCategory, EnergyClass, ProductStatus } from "../enums/product.enum";

export interface ProductSpecs {
  brand?: string;
  model?: string;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  capacityLiters?: number;
  loadKg?: number;
  noiseDb?: number;
  energyKwhPerYear?: number;
  coolingCapacityBtu?: number;
  dustCapacityLiters?: number;
  screenSizeInches?: number;
}

export interface Product extends ProductSpecs {
  productOldPrice?: number;
  installmentLastMonth?: number;
  _id: Types.ObjectId;
  productStatus: ProductStatus;
  productCategory: ProductCategory;
  productName: string;
  productPrice: number;
  productLeftCount: number;
  energyClass?: EnergyClass;
  warrantyYears?: number;
  installmentMonths?: number;
  installmentMonthly?: number;
  productDesc?: string;
  productImages: string[];
  productViews: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductInquiry {
  order: string;
  page: number;
  limit: number;
  productCategory?: ProductCategory;
  search?: string;
  onSale?: boolean;
  brand?: string;
}

export interface ProductInput extends ProductSpecs {
  productOldPrice?: number;
  productStatus?: ProductStatus;
  productCategory: ProductCategory;
  productName: string;
  productPrice: number;
  productLeftCount: number;
  energyClass?: EnergyClass;
  warrantyYears?: number;
  installmentMonths?: number;
  installmentMonthly?: number;
  productDesc?: string;
  productImages?: string[];
  productViews?: number;
}

export interface ProductUpdateInput extends Partial<ProductInput> {
  _id?: Types.ObjectId;
  productStatus?: ProductStatus;
  productCategory?: ProductCategory;
  productName?: string;
  productPrice?: number;
  productLeftCount?: number;
  energyClass?: EnergyClass;
  warrantyYears?: number;
  installmentMonths?: number;
  installmentMonthly?: number;
  productDesc?: string;
  productImages?: string[];
  productViews?: number;
}

export interface ProductListWithStats {
  products: Product[];
  total: number;
  activeCount: number;
  pausedCount: number;
  deletedCount: number;
  lowStockCount: number;
}
export interface ProductPage { items: Product[]; total: number; page: number; limit: number; }

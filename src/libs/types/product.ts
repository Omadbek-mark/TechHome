import { ObjectId } from "mongoose";
import { ProductCategory, EnergyClass, ProductStatus } from "../enums/product.enum";

export interface Product {
  _id: ObjectId;
  productStatus: ProductStatus;
  productCategory: ProductCategory;
  productName: string;
  productPrice: number;
  productLeftCount: number;
  energyClass: EnergyClass;
  warrantyYears: number;
  installmentMonths: number;
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
}

export interface ProductInput {
  productStatus?: ProductStatus;
  productCategory: ProductCategory;
  productName: string;
  productPrice: number;
  productLeftCount: number;
  energyClass?: EnergyClass;
  warrantyYears: number;
  installmentMonths: number;
  productDesc?: string;
  productImages?: string[];
  productViews?: number;
}

export interface ProductUpdateInput {
  _id: ObjectId;
  productStatus?: ProductStatus;
  productCategory?: ProductCategory;
  productName?: string;
  productPrice?: number;
  productLeftCount?: number;
  energyClass?: EnergyClass;
  warrantyYears: number;
  installmentMonths: number;
  productDesc?: string;
  productImages?: string[];
  productViews?: number;
}
import { ProductCategory, ProductStatus, EnergyClass } from '../enums/product.enum';
import { Product, ProductInquiry } from '../types/product';
import { HttpError } from '../security/http';

const invalid = () => new HttpError(400, 'INVALID_PRODUCT', 'Please check the product fields and units.');
export const numericSpecs = ['widthCm', 'heightCm', 'depthCm', 'capacityLiters', 'loadKg', 'noiseDb', 'energyKwhPerYear', 'coolingCapacityBtu', 'dustCapacityLiters', 'screenSizeInches'] as const;
const categorySpecs: Partial<Record<typeof numericSpecs[number], ProductCategory>> = {
  capacityLiters: ProductCategory.KITCHEN, loadKg: ProductCategory.LAUNDRY, coolingCapacityBtu: ProductCategory.CLIMATE,
  dustCapacityLiters: ProductCategory.CLEANING, screenSizeInches: ProductCategory.ENTERTAINMENT,
};
export function catalogInquiry(input: Record<string, unknown>): ProductInquiry {
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (!['string', 'number'].includes(typeof value) || !/^\d+$/.test(String(value))) throw new HttpError(400, 'INVALID_CATALOG_FILTER', 'Please check the catalog filters.');
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) throw new HttpError(400, 'INVALID_CATALOG_FILTER', 'Please check the catalog filters.');
    return parsed;
  };
  const result: ProductInquiry = { page: integer(input.page, 1, 100000), limit: integer(input.limit, 8, 50), order: 'createdAt' };
  if (input.order !== undefined) {
    if (!['createdAt', 'productPrice', 'priceDesc', 'productViews'].includes(input.order as string)) throw new HttpError(400, 'INVALID_CATALOG_FILTER', 'Invalid catalog sort.');
    result.order = input.order as string;
  }
  if (input.productCategory !== undefined) {
    if (!Object.values(ProductCategory).includes(input.productCategory as ProductCategory)) throw new HttpError(400, 'INVALID_CATALOG_FILTER', 'Invalid category.');
    result.productCategory = input.productCategory as ProductCategory;
  }
  for (const key of ['search', 'brand'] as const) if (input[key] !== undefined) {
    if (typeof input[key] !== 'string' || (input[key] as string).length > (key === 'search' ? 100 : 80)) throw new HttpError(400, 'INVALID_CATALOG_FILTER', 'Invalid search text.');
    result[key] = (input[key] as string).trim();
  }
  if (input.onSale !== undefined) {
    if (![true, false, 'true', 'false'].includes(input.onSale as boolean)) throw new HttpError(400, 'INVALID_CATALOG_FILTER', 'Invalid deals filter.');
    result.onSale = input.onSale === true || input.onSale === 'true';
  }
  return result;
}
export const escapeSearch = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function catalogMatch(input: ProductInquiry) {
  const match: Record<string, unknown> = { productStatus: ProductStatus.PROCESS };
  if (input.productCategory) match.productCategory = input.productCategory;
  if (input.search) match.$or = ['productName', 'brand', 'model'].map(field => ({ [field]: { $regex: escapeSearch(input.search!), $options: 'i' } }));
  if (input.brand) match.brand = { $regex: `^${escapeSearch(input.brand)}$`, $options: 'i' };
  if (input.onSale) { match.productOldPrice = { $type: 'number', $gt: 0, $lte: 10000000 }; match.$expr = { $gt: ['$productOldPrice', '$productPrice'] }; }
  return match;
}
export function productResponse(value: Product): Product {
  const raw = (value as Product & { toObject?: () => Product }).toObject?.() ?? value;
  const { installmentMonthly: ignoredMonthly, installmentLastMonth: ignoredLast, productOldPrice, ...data } = raw;
  const cents = Math.round(data.productPrice * 100), months = data.installmentMonths ?? 0;
  const monthly = [6, 12, 24].includes(months) ? Math.floor(cents / months) : undefined;
  return { ...data, ...(typeof productOldPrice === 'number' && Number.isFinite(productOldPrice) && productOldPrice <= 10000000 && productOldPrice > data.productPrice ? { productOldPrice } : {}),
    ...(monthly === undefined ? {} : { installmentMonthly: monthly / 100, installmentLastMonth: (cents - monthly * (months - 1)) / 100 }) };
}

// Only these fields can be supplied by admin forms. Computed prices, views and Mongo operators are never writable here.
export function productFields(input: unknown, current?: Product): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid();
  const source = input as Record<string, unknown>, fields: Record<string, unknown> = {};
  const allowed = ['productName', 'productCategory', 'productStatus', 'productPrice', 'productOldPrice', 'productLeftCount', 'warrantyYears', 'installmentMonths', 'energyClass', 'productDesc', 'brand', 'model', ...numericSpecs];
  const ignored = ['_csrf', 'memberId', 'installmentMonthly', 'installmentLastMonth', 'productViews'];
  if (Object.keys(source).some(key => !allowed.includes(key) && !ignored.includes(key))) throw invalid();
  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    let value = source[key];
    const optional = ['productOldPrice', 'energyClass', 'productDesc', 'brand', 'model', ...numericSpecs].includes(key);
    if (value === null || value === '') { if (!optional) throw invalid(); fields[key] = null; continue; }
    if (['productPrice', 'productOldPrice', 'productLeftCount', 'warrantyYears', 'installmentMonths', ...numericSpecs].includes(key)) {
      if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value))) throw invalid();
      value = Number(value);
      if (!Number.isFinite(value) || (value as number) < 0 || (value as number) > 10000000) throw invalid();
      if (['productPrice', 'productOldPrice'].includes(key) && Math.abs((value as number) * 100 - Math.round((value as number) * 100)) > 1e-6) throw invalid();
      if (key === 'productLeftCount' && !Number.isSafeInteger(value)) throw invalid();
      if (key === 'warrantyYears' && ![0, 1, 2, 3].includes(value as number)) throw invalid();
      if (key === 'installmentMonths' && ![0, 6, 12, 24].includes(value as number)) throw invalid();
      if (numericSpecs.includes(key as typeof numericSpecs[number]) && (value as number) <= 0) throw invalid();
    } else {
      if (typeof value !== 'string') throw invalid();
      value = value.trim();
      if (!(value as string).length || (value as string).length > (key === 'productDesc' ? 2000 : key === 'productName' ? 200 : 80)) throw invalid();
      if (key === 'productCategory' && !Object.values(ProductCategory).includes(value as ProductCategory) ||
          key === 'productStatus' && !Object.values(ProductStatus).includes(value as ProductStatus) ||
          key === 'energyClass' && !Object.values(EnergyClass).includes(value as EnergyClass)) throw invalid();
    }
    fields[key] = value;
  }
  const merged = { ...current, ...fields } as unknown as Product;
  if (!current && ['productName', 'productCategory', 'productPrice', 'productLeftCount'].some(key => fields[key] === undefined)) throw invalid();
  if (merged.productOldPrice != null && merged.productOldPrice <= merged.productPrice) throw new HttpError(400, 'INVALID_DISCOUNT', 'Old price must be greater than the current price, or left empty.');
  for (const [field, category] of Object.entries(categorySpecs)) {
    if (fields.productCategory && current?.productCategory !== fields.productCategory && !Object.prototype.hasOwnProperty.call(fields, field)) fields[field] = null;
    if (fields[field] != null && merged.productCategory !== category) throw new HttpError(400, 'INVALID_PRODUCT_SPEC', 'This specification does not apply to the selected category.');
  }
  const response = productResponse({ ...merged, installmentMonths: merged.installmentMonths ?? 0 });
  fields.installmentMonthly = response.installmentMonthly ?? null;
  fields.installmentLastMonth = response.installmentLastMonth ?? null;
  return fields;
}

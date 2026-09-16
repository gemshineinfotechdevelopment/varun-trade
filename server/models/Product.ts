import mongoose, { Schema, Document } from 'mongoose';

export interface IPricingDetails {
  rate: number; // MRP / Original Rate
  discountPercentage: number; // e.g., 90 for ninetyPercent, or default 30 for custom
  discountPrice?: number; // (rate * discountPercentage) / 100
  netRate: number; // rate - discountPrice
  isAvailable: boolean; // whether product is active in this pricing mode
}

export interface IProduct extends Document {
  slNo: number;
  sku: string;
  name: string;
  category: string;
  brand?: string;
  unit: string;
  hsn?: string;
  stock: number; // Shared physical inventory between both pricing modes
  image?: string;
  isActive: boolean;
  pricing: {
    ninetyPercent: IPricingDetails;
    custom: IPricingDetails;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PricingDetailsSchema: Schema = new Schema(
  {
    rate: { type: Number, required: true, default: 0 },
    discountPercentage: { type: Number, required: true, default: 0 },
    discountPrice: { type: Number, default: 0 },
    netRate: { type: Number, required: true, default: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { _id: false }
);

const ProductSchema: Schema = new Schema(
  {
    slNo: { type: Number, required: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'General' },
    brand: { type: String, trim: true, default: 'Standard' },
    unit: { type: String, trim: true, default: 'Box' },
    hsn: { type: String, trim: true, default: '3604' },
    stock: { type: Number, default: 0, min: 0 },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    pricing: {
      ninetyPercent: {
        type: PricingDetailsSchema,
        default: () => ({
          rate: 0,
          discountPercentage: 90,
          discountPrice: 0,
          netRate: 0,
          isAvailable: true,
        }),
      },
      custom: {
        type: PricingDetailsSchema,
        default: () => ({
          rate: 0,
          discountPercentage: 30,
          discountPrice: 0,
          netRate: 0,
          isAvailable: true,
        }),
      },
    },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 1, sku: 1, category: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
export default Product;

import mongoose, { Schema, Document } from 'mongoose';

export type PriceListType = '90_PERCENT' | 'CUSTOM';

export interface IPriceListItem extends Document {
  sku: string;
  productName: string;
  itemName?: string; // alias for compatibility
  category: string;
  priceListType: PriceListType;
  rate: number; // MRP / Original Rate
  discountPercentage: number; // Discount % (90 for 90_PERCENT, custom % for CUSTOM)
  discountAmount: number; // (rate * discountPercentage) / 100
  netRate: number; // rate - discountAmount
  quantity: number; // Quantity / Count per pack or default qty
  unit: string; // Per / PCS / Box / Pkt
  stock?: number; // Physical stock reference
  active: boolean;
  batchName?: string;
  slNo?: number;
  createdAt: Date;
  updatedAt: Date;
}

const PriceListItemSchema: Schema = new Schema(
  {
    slNo: {
      type: Number,
      default: 1,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
    },
    productName: {
      type: String,
      required: [true, 'Product Name is required'],
      trim: true,
    },
    itemName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    priceListType: {
      type: String,
      enum: ['90_PERCENT', 'CUSTOM'],
      required: [true, 'Price list type is required (90_PERCENT or CUSTOM)'],
      index: true,
    },
    rate: {
      type: Number,
      required: [true, 'Rate / MRP is required'],
      default: 0,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      required: [true, 'Discount percentage is required'],
      default: 0,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    netRate: {
      type: Number,
      required: [true, 'Net Rate / Selling Price is required'],
      default: 0,
      min: 0,
    },
    quantity: {
      type: Number,
      default: 10,
    },
    unit: {
      type: String,
      trim: true,
      default: 'Box',
    },
    stock: {
      type: Number,
      default: 100,
    },
    active: {
      type: Boolean,
      default: true,
    },
    batchName: {
      type: String,
      trim: true,
      default: 'Standard Upload',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to ensure productName and itemName are synced and netRate is calculated
PriceListItemSchema.pre('save', function (this: any, next) {
  if (!this.itemName && this.productName) {
    this.itemName = this.productName;
  }
  if (!this.productName && this.itemName) {
    this.productName = this.itemName;
  }
  // Compute discountAmount and netRate if rate is present
  const rateNum = Number(this.rate) || 0;
  const discPct = Number(this.discountPercentage) || (this.priceListType === '90_PERCENT' ? 90 : 0);
  this.discountAmount = Math.round(((rateNum * discPct) / 100) * 100) / 100;
  if (!this.netRate || (typeof this.isModified === 'function' && (this.isModified('rate') || this.isModified('discountPercentage')))) {
    this.netRate = Math.max(0, Math.round((rateNum - this.discountAmount) * 100) / 100);
  }
  next();
});

// Compound Unique Indexes scoped to priceListType
PriceListItemSchema.index({ sku: 1, priceListType: 1 }, { unique: true });
PriceListItemSchema.index({ productName: 1, priceListType: 1 });
PriceListItemSchema.index({ category: 1, priceListType: 1 });

export const PriceList = mongoose.model<IPriceListItem>('PriceList', PriceListItemSchema);
export default PriceList;

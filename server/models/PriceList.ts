import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceListItem extends Document {
  slNo?: number;
  itemName: string;
  category: string;
  unit: string;
  mrp: number;
  discountPercent?: number;
  rate: number;
  stock?: number;
  effectiveDate?: string;
  batchName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PriceListItemSchema: Schema = new Schema(
  {
    slNo: {
      type: Number,
      default: 1,
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    unit: {
      type: String,
      trim: true,
      default: 'Box',
    },
    mrp: {
      type: Number,
      default: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
    },
    rate: {
      type: Number,
      required: [true, 'Rate/Price is required'],
      default: 0,
    },
    stock: {
      type: Number,
      default: 0,
    },
    effectiveDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    batchName: {
      type: String,
      trim: true,
      default: 'Standard Price List',
    },
  },
  {
    timestamps: true,
  }
);

PriceListItemSchema.index({ itemName: 1, category: 1 });

export default mongoose.model<IPriceListItem>('PriceList', PriceListItemSchema);

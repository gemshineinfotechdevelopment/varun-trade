import mongoose, { Schema, Document } from 'mongoose';
import { PriceListType } from './PriceList';

export interface IParticularProductItem {
  priceListId?: string;
  sku?: string;
  productName: string;
  particular?: string; // alias
  category?: string;
  quantity: string | number;
  rate: string | number; // Rate from the specific price list
  discountPercentage?: string | number;
  discountAmount?: string | number;
  netRate?: string | number; // Net selling price
  pktUnit: string;
  amount: string | number; // Line Total (netRate * quantity)
  priceListType?: PriceListType;
}

export interface IParticular extends Document {
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGst?: string;
  caseCount: string;
  companyName: string;
  priceListType: PriceListType;
  pricingMode?: string; // alias
  customDiscountPercent?: number;
  discount: string;
  transport: string;
  packing: string;
  billNo: string;
  tax: string;
  amount: string; // Subtotal
  total: string; // Grand Total
  paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
  paymentMode?: 'CASH' | 'UPI' | 'BANK' | 'CREDIT';
  paidAmount?: string;
  notes?: string;
  date: string;
  pdfData?: string;
  pdfName?: string;
  pdfPublicId?: string;
  products: IParticularProductItem[];
  createdAt: Date;
  updatedAt: Date;
}

const ParticularProductItemSchema: Schema = new Schema({
  priceListId: { type: Schema.Types.ObjectId, ref: 'PriceList' },
  sku: { type: String, default: '' },
  productName: { type: String, required: true },
  particular: { type: String, default: '' },
  category: { type: String, default: 'General' },
  quantity: { type: Schema.Types.Mixed, default: '1' },
  rate: { type: Schema.Types.Mixed, default: '0' },
  discountPercentage: { type: Schema.Types.Mixed, default: '0' },
  discountAmount: { type: Schema.Types.Mixed, default: '0' },
  netRate: { type: Schema.Types.Mixed, default: '0' },
  pktUnit: { type: String, default: 'Box' },
  amount: { type: Schema.Types.Mixed, default: '0' },
  priceListType: { type: String, enum: ['90_PERCENT', 'CUSTOM'], default: '90_PERCENT' },
});

// Pre-save to sync particular and productName
ParticularProductItemSchema.pre('save', function (next) {
  if (!this.particular && this.productName) {
    this.particular = this.productName;
  }
  if (!this.productName && this.particular) {
    this.productName = this.particular;
  }
  next();
});

const ParticularSchema: Schema = new Schema(
  {
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, default: '' },
    customerAddress: { type: String, default: '' },
    customerGst: { type: String, default: '' },
    caseCount: { type: String, default: '0' },
    companyName: { type: String, required: true, trim: true },
    priceListType: {
      type: String,
      enum: ['90_PERCENT', 'CUSTOM'],
      default: '90_PERCENT',
      index: true,
    },
    pricingMode: {
      type: String,
      default: '90_PERCENT',
    },
    customDiscountPercent: {
      type: Number,
      default: null,
    },
    discount: { type: String, default: '0' },
    transport: { type: String, default: '0' },
    packing: { type: String, default: '0' },
    billNo: { type: String, required: true, trim: true },
    tax: { type: String, default: '0' },
    amount: { type: String, default: '0.00' },
    total: { type: String, default: '0.00' },
    paymentStatus: { type: String, enum: ['PAID', 'UNPAID', 'PARTIAL'], default: 'UNPAID' },
    paymentMode: { type: String, enum: ['CASH', 'UPI', 'BANK', 'CREDIT'], default: 'CREDIT' },
    paidAmount: { type: String, default: '0.00' },
    notes: { type: String, default: '' },
    date: { type: String, required: true },
    pdfData: { type: String, default: '' },
    pdfName: { type: String, default: '' },
    pdfPublicId: { type: String, default: '' },
    products: [ParticularProductItemSchema],
  },
  { timestamps: true }
);

ParticularSchema.index({ billNo: 1, customerName: 1, date: -1, priceListType: 1 });

export const Particular = mongoose.model<IParticular>('Particular', ParticularSchema);
export default Particular;

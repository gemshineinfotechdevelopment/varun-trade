import mongoose, { Schema, Document } from 'mongoose';

export interface IParticularProductItem {
  particular: string;
  quantity: string;
  rate: string;
  pktUnit: string;
  amount: string;
}

export interface IParticular extends Document {
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGst?: string;
  caseCount: string;
  companyName: string;
  discount: string;
  transport: string;
  packing: string;
  billNo: string;
  tax: string;
  amount: string;
  total: string;
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
  particular: { type: String, required: true },
  quantity: { type: String, default: '' },
  rate: { type: String, default: '' },
  pktUnit: { type: String, default: '' },
  amount: { type: String, default: '' },
});

const ParticularSchema: Schema = new Schema(
  {
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, default: '' },
    customerAddress: { type: String, default: '' },
    customerGst: { type: String, default: '' },
    caseCount: { type: String, default: '0' },
    companyName: { type: String, required: true, trim: true },
    discount: { type: String, default: '' },
    transport: { type: String, default: '' },
    packing: { type: String, default: '' },
    billNo: { type: String, required: true, trim: true },
    tax: { type: String, default: '' },
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

export const Particular = mongoose.model<IParticular>('Particular', ParticularSchema);

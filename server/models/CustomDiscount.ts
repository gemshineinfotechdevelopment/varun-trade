import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomDiscount extends Document {
  percentage: number;
  label?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomDiscountSchema: Schema = new Schema(
  {
    percentage: {
      type: Number,
      required: [true, 'Discount percentage is required'],
      min: [0, 'Discount percentage cannot be negative'],
      max: [99, 'Discount percentage must be less than 100%'],
      unique: true,
    },
    label: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const CustomDiscount = mongoose.model<ICustomDiscount>('CustomDiscount', CustomDiscountSchema);
export default CustomDiscount;

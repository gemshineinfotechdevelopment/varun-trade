import { Request, Response } from 'express';
import CustomDiscount from '../models/CustomDiscount';

const DEFAULT_DISCOUNTS = [
  { percentage: 10, label: '10% Discount', displayOrder: 1, isActive: true },
  { percentage: 20, label: '20% Discount', displayOrder: 2, isActive: true },
  { percentage: 30, label: '30% Discount', displayOrder: 3, isActive: true },
  { percentage: 40, label: '40% Discount', displayOrder: 4, isActive: true },
  { percentage: 50, label: '50% Discount', displayOrder: 5, isActive: true },
  { percentage: 60, label: '60% Discount', displayOrder: 6, isActive: true },
  { percentage: 70, label: '70% Discount', displayOrder: 7, isActive: true },
  { percentage: 80, label: '80% Discount', displayOrder: 8, isActive: true },
];

export const getCustomDiscounts = async (_req: Request, res: Response): Promise<void> => {
  try {
    let discounts = await CustomDiscount.find().sort({ displayOrder: 1, percentage: 1 });

    // Auto-seed defaults if empty
    if (discounts.length === 0) {
      await CustomDiscount.insertMany(DEFAULT_DISCOUNTS);
      discounts = await CustomDiscount.find().sort({ displayOrder: 1, percentage: 1 });
    }

    res.status(200).json({
      success: true,
      count: discounts.length,
      data: discounts,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error fetching custom discounts' });
  }
};

export const createCustomDiscount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { percentage, label, isActive, displayOrder } = req.body;

    const numPct = Number(percentage);
    if (isNaN(numPct) || numPct < 0 || numPct >= 100) {
      res.status(400).json({ success: false, error: 'Percentage must be a number between 0 and 99.' });
      return;
    }

    const existing = await CustomDiscount.findOne({ percentage: numPct });
    if (existing) {
      res.status(400).json({ success: false, error: `Custom discount of ${numPct}% already exists.` });
      return;
    }

    const maxOrder = (await CustomDiscount.countDocuments()) + 1;

    const discount = await CustomDiscount.create({
      percentage: numPct,
      label: label || `${numPct}% Discount`,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      displayOrder: displayOrder || maxOrder,
    });

    res.status(201).json({ success: true, data: discount });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateCustomDiscount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { percentage, label, isActive, displayOrder } = req.body;

    const discount = await CustomDiscount.findById(id);
    if (!discount) {
      res.status(404).json({ success: false, error: 'Custom discount option not found.' });
      return;
    }

    if (percentage !== undefined) {
      const numPct = Number(percentage);
      if (isNaN(numPct) || numPct < 0 || numPct >= 100) {
        res.status(400).json({ success: false, error: 'Percentage must be between 0 and 99.' });
        return;
      }
      discount.percentage = numPct;
    }

    if (label !== undefined) discount.label = label;
    if (isActive !== undefined) discount.isActive = Boolean(isActive);
    if (displayOrder !== undefined) discount.displayOrder = Number(displayOrder);

    await discount.save();

    res.status(200).json({ success: true, data: discount });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteCustomDiscount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const discount = await CustomDiscount.findByIdAndDelete(id);
    if (!discount) {
      res.status(404).json({ success: false, error: 'Custom discount option not found.' });
      return;
    }

    res.status(200).json({ success: true, message: `Discount tier of ${discount.percentage}% deleted successfully.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

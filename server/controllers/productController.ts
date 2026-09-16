import type { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import PriceList from '../models/PriceList';

export const getProducts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const products = await Product.find().sort({ slNo: 1, createdAt: 1 });
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const nextSlNo = (await Product.countDocuments()) + 1;
    const cleanSku = (req.body.sku || `CK-${String(nextSlNo).padStart(3, '0')}`).trim().toUpperCase();

    const product = await Product.create({
      ...req.body,
      slNo: req.body.slNo || nextSlNo,
      sku: cleanSku,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const oldProduct = await Product.findById(req.params.id);
    if (!oldProduct) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const oldName = oldProduct.name;
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    // Sync update to PriceList
    try {
      const escapedOldName = oldName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await PriceList.updateMany(
        { itemName: { $regex: new RegExp(`^${escapedOldName}$`, 'i') } },
        {
          ...(product.name && { itemName: product.name.trim() }),
          ...(product.category && { category: product.category }),
          ...(product.unit && { unit: product.unit }),
        }
      );
    } catch (syncErr) {
      console.warn('[Product Update Sync Warning]:', syncErr);
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const productName = product.name;

    // 1. Delete product
    await Product.findByIdAndDelete(req.params.id);

    // 2. Cascade Delete: Delete from PriceList collection as well
    if (productName && productName.trim()) {
      const escapedName = productName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await PriceList.deleteMany({
        itemName: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

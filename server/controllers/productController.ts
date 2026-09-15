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
    const product = await Product.create(req.body);

    // Sync to PriceList
    try {
      const cleanName = (product.name || '').trim();
      const existingPrice = await PriceList.findOne({
        itemName: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });

      if (!existingPrice && cleanName) {
        const totalCount = await PriceList.countDocuments();
        await PriceList.create({
          slNo: totalCount + 1,
          itemName: cleanName,
          category: product.category || 'General',
          unit: product.unit || 'Box',
          mrp: product.mrp || 0,
          rate: product.rate || 0,
          stock: 0,
          effectiveDate: new Date().toISOString().split('T')[0],
          batchName: 'Product Sync',
        });
      }
    } catch (syncErr) {
      console.warn('[Product Create Sync Warning]:', syncErr);
    }

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
          ...(product.rate !== undefined && { rate: Number(product.rate) }),
          ...(product.mrp !== undefined && { mrp: Number(product.mrp) }),
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

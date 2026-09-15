import { Request, Response } from 'express';
import PriceList from '../models/PriceList';
import Category from '../models/Category';
import { Product } from '../models/Product';

const PRESET_COLORS = [
  '#DC2626', '#EA580C', '#D97706', '#059669', '#2563EB', '#7C3AED', '#DB2777', '#4B5563'
];

const cleanToEnglish = (text: string): string => {
  if (!text) return '';
  let str = String(text).trim();
  if (/[a-zA-Z]/.test(str)) {
    str = str.replace(/[\u0B80-\u0BFF]+/g, ' ');
  }
  return str
    .replace(/\(\s*\)/g, ' ')
    .replace(/\[\s*\]/g, ' ')
    .replace(/\{\s*\}/g, ' ')
    .replace(/[\/\\|:_\-~*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper to auto-sync categories and products into DB
const syncCategoriesAndProducts = async (items: any[]) => {
  try {
    // 1. Sync Categories
    const rawCategories = Array.from(new Set(items.map((i) => cleanToEnglish(i.category) || 'General').filter(Boolean)));
    const existingCategories = await Category.find();
    const existingCatNames = new Set(existingCategories.map((c) => c.name.toLowerCase().trim()));

    const newCategoriesToInsert: Array<{
      name: string;
      code: string;
      description: string;
      color: string;
      displayOrder: number;
      isActive: boolean;
    }> = [];
    for (const catName of rawCategories) {
      if (!existingCatNames.has(catName.toLowerCase().trim())) {
        const code = catName
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 4);
        const colorHex: string = PRESET_COLORS[(existingCategories.length + newCategoriesToInsert.length) % PRESET_COLORS.length] || '#DC2626';
        newCategoriesToInsert.push({
          name: catName,
          code: code || 'CAT',
          description: `Auto-created from Price List`,
          color: colorHex,
          displayOrder: existingCategories.length + newCategoriesToInsert.length + 1,
          isActive: true,
        });
        existingCatNames.add(catName.toLowerCase().trim());
      }
    }

    if (newCategoriesToInsert.length > 0) {
      await Category.insertMany(newCategoriesToInsert);
    }

    // 2. Sync Products
    const existingProducts = await Product.find();
    const existingProdMap = new Map(existingProducts.map((p) => [p.name.toLowerCase().trim(), p]));
    let maxSlNo = existingProducts.length > 0 ? Math.max(...existingProducts.map((p) => p.slNo || 0)) : 0;

    for (const item of items) {
      const cleanName = cleanToEnglish(String(item.itemName || item.name || ''));
      const nameKey = cleanName.toLowerCase().trim();
      if (!nameKey) continue;

      const rateVal = Number(item.rate || item.price || 0);
      const mrpVal = Number(item.mrp || 0);
      const unitVal = cleanToEnglish(String(item.unit || 'Box')) || 'Box';
      const catVal = cleanToEnglish(String(item.category || 'General')) || 'General';

      if (existingProdMap.has(nameKey)) {
        // Update product rate/category
        const existing = existingProdMap.get(nameKey);
        if (existing) {
          await Product.findByIdAndUpdate(existing._id, {
            category: catVal,
            rate: rateVal,
            mrp: mrpVal,
            unit: unitVal,
          });
        }
      } else {
        // Insert new product
        maxSlNo += 1;
        const created = await Product.create({
          slNo: maxSlNo,
          name: cleanName,
          category: catVal,
          rate: rateVal,
          mrp: mrpVal,
          unit: unitVal,
        });
        existingProdMap.set(nameKey, created);
      }
    }
  } catch (syncErr) {
    console.error('[Sync Error] Failed to sync categories and products:', syncErr);
  }
};

export const getPriceList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search } = req.query;
    const filter: any = {};

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { itemName: { $regex: String(search), $options: 'i' } },
        { category: { $regex: String(search), $options: 'i' } },
        { batchName: { $regex: String(search), $options: 'i' } },
      ];
    }

    const items = await PriceList.find(filter).sort({ slNo: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error while fetching price list',
    });
  }
};

export const createPriceListItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemName, category, unit, mrp, discountPercent, rate, stock, effectiveDate, batchName, slNo } = req.body;

    if (!itemName || !itemName.trim()) {
      res.status(400).json({ success: false, error: 'Item name is required' });
      return;
    }

    const nextSlNo = slNo || (await PriceList.countDocuments()) + 1;

    const item = await PriceList.create({
      slNo: nextSlNo,
      itemName: itemName.trim(),
      category: category || 'General',
      unit: unit || 'Box',
      mrp: Number(mrp) || 0,
      discountPercent: Number(discountPercent) || 0,
      rate: Number(rate) || 0,
      stock: Number(stock) || 0,
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      batchName: batchName || 'Manual Entry',
    });

    // Auto-sync category and product
    await syncCategoriesAndProducts([item]);

    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const bulkImportPriceList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, batchName, replaceExisting } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'No items provided for import' });
      return;
    }

    if (replaceExisting) {
      await PriceList.deleteMany({});
      await Product.deleteMany({}); // Also remove products when replacing entire price list
    }

    const currentCount = replaceExisting ? 0 : await PriceList.countDocuments();
    const batchTitle = batchName || `Upload-${new Date().toLocaleDateString('en-GB')}`;

    const formattedItems = items.map((item: any, idx: number) => ({
      slNo: item.slNo || currentCount + idx + 1,
      itemName: cleanToEnglish(String(item.itemName || item.name || item['Product Name'] || item['Item Name'] || '')),
      category: cleanToEnglish(String(item.category || item.Category || 'General')) || 'General',
      unit: cleanToEnglish(String(item.unit || item.Unit || 'Box')) || 'Box',
      mrp: Number(item.mrp || item.MRP || item['M.R.P'] || 0),
      discountPercent: Number(item.discountPercent || item.discount || item['Discount %'] || 0),
      rate: Number(item.rate || item.price || item.Rate || item['Net Rate'] || item['Selling Price'] || 0),
      stock: Number(item.stock || item.Stock || item['Qty'] || 0),
      effectiveDate: item.effectiveDate || new Date().toISOString().split('T')[0],
      batchName: batchTitle,
    })).filter((i: any) => Boolean(i.itemName));

    if (formattedItems.length === 0) {
      res.status(400).json({ success: false, error: 'No valid items with names found in the uploaded file' });
      return;
    }

    const inserted = await PriceList.insertMany(formattedItems);

    // Auto-sync into Categories and Products collections
    await syncCategoriesAndProducts(formattedItems);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} price list items, and synced Categories & Products!`,
      count: inserted.length,
      data: inserted,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePriceListItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await PriceList.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      res.status(404).json({ success: false, error: 'Price item not found' });
      return;
    }

    // Auto sync update to product
    await syncCategoriesAndProducts([item]);

    res.status(200).json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deletePriceListItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await PriceList.findByIdAndDelete(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Price item not found' });
      return;
    }

    // Auto-delete matching product from Products collection!
    const escapedName = item.itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await Product.deleteMany({
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    });

    res.status(200).json({ success: true, message: `Price item "${item.itemName}" and matching product deleted successfully` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deletePriceListBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchName } = req.params;
    if (!batchName) {
      res.status(400).json({ success: false, error: 'Batch name is required' });
      return;
    }

    const itemsToDelete = await PriceList.find({ batchName });
    const itemNames = itemsToDelete.map((i) => i.itemName.trim());

    await PriceList.deleteMany({ batchName });

    if (itemNames.length > 0) {
      await Product.deleteMany({
        name: { $in: itemNames },
      });
    }

    res.status(200).json({
      success: true,
      message: `Deleted ${itemsToDelete.length} items from batch "${batchName}" and removed them from Products catalog.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const clearAllPriceList = async (_req: Request, res: Response): Promise<void> => {
  try {
    await PriceList.deleteMany({});
    await Product.deleteMany({}); // Also clear all products
    res.status(200).json({ success: true, message: 'All price list items and products cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

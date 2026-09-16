import { Request, Response } from 'express';
import PriceList, { PriceListType } from '../models/PriceList';
import Category from '../models/Category';
import Product from '../models/Product';

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

/**
 * Sync master categories and master physical product items
 */
const syncMasterCatalog = async (items: any[]) => {
  try {
    // 1. Sync Categories
    const rawCategories = Array.from(new Set(items.map((i) => cleanToEnglish(i.category) || 'General').filter(Boolean)));
    const existingCategories = await Category.find();
    const existingCatNames = new Set(existingCategories.map((c) => c.name.toLowerCase().trim()));

    const newCategoriesToInsert: any[] = [];
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
          description: 'Auto-created from Price List Import',
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

    // 2. Sync master Product inventory (physical stock tracking)
    const existingProducts = await Product.find();
    const skuMap = new Map(existingProducts.map((p) => [p.sku.toUpperCase().trim(), p]));
    let maxSlNo = existingProducts.length > 0 ? Math.max(...existingProducts.map((p) => p.slNo || 0)) : 0;

    for (const item of items) {
      const cleanSku = String(item.sku || '').trim().toUpperCase();
      const cleanName = cleanToEnglish(String(item.productName || item.itemName || ''));
      if (!cleanSku || !cleanName) continue;

      if (!skuMap.has(cleanSku)) {
        maxSlNo += 1;
        const newMaster = await Product.create({
          slNo: maxSlNo,
          sku: cleanSku,
          name: cleanName,
          category: cleanToEnglish(String(item.category || 'General')) || 'General',
          brand: item.brand || 'Standard',
          unit: cleanToEnglish(String(item.unit || 'Box')) || 'Box',
          hsn: item.hsn || '3604',
          stock: Number(item.stock || 100),
          isActive: true,
        });
        skuMap.set(cleanSku, newMaster);
      }
    }
  } catch (err) {
    console.error('[Catalog Sync Warning]:', err);
  }
};

/**
 * GET /api/price-lists?type=90_PERCENT or ?type=CUSTOM
 */
export const getPriceLists = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, category, search } = req.query;

    const targetType: PriceListType =
      String(type || '').toUpperCase() === 'CUSTOM' ? 'CUSTOM' : '90_PERCENT';

    const filter: any = { priceListType: targetType };

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { productName: { $regex: String(search), $options: 'i' } },
        { itemName: { $regex: String(search), $options: 'i' } },
        { sku: { $regex: String(search), $options: 'i' } },
        { category: { $regex: String(search), $options: 'i' } },
        { batchName: { $regex: String(search), $options: 'i' } },
      ];
    }

    const items = await PriceList.find(filter).sort({ slNo: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      priceListType: targetType,
      count: items.length,
      data: items,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error fetching price list' });
  }
};

/**
 * GET /api/billing/products?priceListType=90_PERCENT&search=...
 * Billing search endpoint strictly scoped to the active priceListType.
 */
export const getBillingProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { priceListType, search, category } = req.query;

    const targetType: PriceListType =
      String(priceListType || '').toUpperCase() === 'CUSTOM' ? 'CUSTOM' : '90_PERCENT';

    const filter: any = {
      priceListType: targetType,
      active: { $ne: false },
    };

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (search && String(search).trim() !== '') {
      const term = String(search).trim();
      filter.$or = [
        { productName: { $regex: term, $options: 'i' } },
        { itemName: { $regex: term, $options: 'i' } },
        { sku: { $regex: term, $options: 'i' } },
        { category: { $regex: term, $options: 'i' } },
      ];
    }

    const items = await PriceList.find(filter).sort({ slNo: 1, productName: 1 });

    // Attach physical master stock
    const allMasterProducts = await Product.find({}, 'sku stock');
    const stockMap = new Map(allMasterProducts.map((p) => [p.sku.toUpperCase(), p.stock]));

    const enrichedItems = items.map((item) => {
      const masterStock = stockMap.get(item.sku.toUpperCase());
      return {
        ...item.toObject(),
        stock: masterStock !== undefined ? masterStock : item.stock || 100,
      };
    });

    res.status(200).json({
      success: true,
      priceListType: targetType,
      count: enrichedItems.length,
      data: enrichedItems,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error searching billing products' });
  }
};

/**
 * POST /api/price-lists/import
 * Bulk upload strictly attaches UI-selected priceListType and validates duplicate scoped to that list.
 */
export const importPriceList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { priceListType, items, batchName, replaceExisting } = req.body;

    if (!priceListType || (priceListType !== '90_PERCENT' && priceListType !== 'CUSTOM')) {
      res.status(400).json({
        success: false,
        error: 'Invalid or missing priceListType in request. Must be "90_PERCENT" or "CUSTOM".',
      });
      return;
    }

    const targetType: PriceListType = priceListType;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'No items provided for import' });
      return;
    }

    if (replaceExisting) {
      await PriceList.deleteMany({ priceListType: targetType });
    }

    const currentCount = replaceExisting ? 0 : await PriceList.countDocuments({ priceListType: targetType });
    const batchTitle = batchName || `Upload-${targetType}-${new Date().toLocaleDateString('en-GB')}`;

    const formattedItems: any[] = [];
    const seenSkus = new Set<string>();

    for (let idx = 0; idx < items.length; idx++) {
      const raw = items[idx];
      const name = cleanToEnglish(
        String(
          raw.productName ||
          raw.itemName ||
          raw.name ||
          raw['Product Name'] ||
          raw['productName'] ||
          raw['Item Name'] ||
          raw['itemName'] ||
          raw['Product'] ||
          raw['Particulars'] ||
          raw['Description'] ||
          ''
        )
      );
      if (!name) continue;

      const slNo = Number(raw.slNo || raw['S.No'] || raw['Sl No'] || raw['Sl.No'] || currentCount + idx + 1);
      const sku = String(
        raw.sku ||
        raw.SKU ||
        raw['Product Code / SKU'] ||
        raw['Product Code'] ||
        raw['Product code'] ||
        raw['sku'] ||
        raw['Code'] ||
        raw['Item Code'] ||
        `CK-${String(slNo).padStart(3, '0')}`
      ).trim().toUpperCase();

      if (seenSkus.has(sku)) continue; // Skip in-file duplicates
      seenSkus.add(sku);

      const rate = Number(
        raw.rate ||
        raw['MRP Price / Rate'] ||
        raw['MRP Price'] ||
        raw['MRP Rate'] ||
        raw['MRP'] ||
        raw['Rate'] ||
        raw['Product Rate'] ||
        raw['rate'] ||
        raw['Price'] ||
        raw.mrp ||
        raw.MRP ||
        0
      );

      const defaultDisc = targetType === '90_PERCENT' ? 90 : 30;
      const discountPercentage = targetType === '90_PERCENT'
        ? 90
        : Number(
            raw.discountPercentage ||
            raw['Discount %'] ||
            raw['Discount Percentage'] ||
            raw['90% Discount'] ||
            raw['Discount'] ||
            raw.discountPercent ||
            raw.discount ||
            defaultDisc
          );

      const discountAmount = Math.round(((rate * discountPercentage) / 100) * 100) / 100;
      const rawNet = Number(
        raw.netRate ||
        raw['Net Rate'] ||
        raw['Net Price'] ||
        raw['netRate'] ||
        raw['Selling Price'] ||
        raw['Selling Rate'] ||
        raw['Final Selling Price'] ||
        0
      );
      const netRate = rawNet > 0 ? rawNet : Math.max(0, Math.round((rate - discountAmount) * 100) / 100);

      const quantity = Number(
        raw.quantity ||
        raw['Quantity / Count'] ||
        raw['Quantity'] ||
        raw['Qty'] ||
        raw['Count'] ||
        10
      );

      const unit = cleanToEnglish(
        String(
          raw.unit ||
          raw['Per / PCS'] ||
          raw['Per/PCS'] ||
          raw['Unit'] ||
          raw['unit'] ||
          raw['Per'] ||
          raw['PCS'] ||
          'Box'
        )
      ) || 'Box';

      const category = cleanToEnglish(
        String(
          raw.category ||
          raw['Product Category'] ||
          raw['Category'] ||
          raw['category'] ||
          raw['Group'] ||
          'General'
        )
      ) || 'General';

      const stock = Number(raw.stock || raw['Stock'] || raw['Physical Stock'] || 100);

      formattedItems.push({
        slNo,
        sku,
        productName: name,
        itemName: name,
        category,
        priceListType: targetType,
        rate,
        discountPercentage,
        discountAmount,
        netRate,
        quantity: !isNaN(quantity) && quantity > 0 ? quantity : 10,
        unit,
        stock: !isNaN(stock) ? stock : 100,
        active: true,
        batchName: batchTitle,
      });
    }

    if (formattedItems.length === 0) {
      res.status(400).json({ success: false, error: 'No valid products found in uploaded data' });
      return;
    }

    // Upsert items strictly for targetType
    const operations = formattedItems.map((doc) => ({
      updateOne: {
        filter: { sku: doc.sku, priceListType: targetType },
        update: { $set: doc },
        upsert: true,
      },
    }));

    await PriceList.bulkWrite(operations);

    // Sync master categories and product catalog
    await syncMasterCatalog(formattedItems);

    const updatedCount = await PriceList.countDocuments({ priceListType: targetType });

    res.status(201).json({
      success: true,
      message: `Successfully imported ${formattedItems.length} items into ${targetType === '90_PERCENT' ? '90% Discount Price List' : 'Custom Discount Price List'}!`,
      priceListType: targetType,
      count: formattedItems.length,
      totalInList: updatedCount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/price-lists
 * Create a single item in the specified priceListType
 */
export const createPriceListItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      sku,
      productName,
      itemName,
      category,
      priceListType = '90_PERCENT',
      rate,
      discountPercentage,
      quantity,
      unit,
      stock,
      active,
      batchName,
      slNo,
    } = req.body;

    const name = (productName || itemName || '').trim();
    if (!name) {
      res.status(400).json({ success: false, error: 'Product name is required' });
      return;
    }

    const targetType: PriceListType =
      String(priceListType).toUpperCase() === 'CUSTOM' ? 'CUSTOM' : '90_PERCENT';

    const nextSlNo = slNo || (await PriceList.countDocuments({ priceListType: targetType })) + 1;
    const cleanSku = (sku || `CK-${String(nextSlNo).padStart(3, '0')}`).trim().toUpperCase();

    const existingInSameList = await PriceList.findOne({ sku: cleanSku, priceListType: targetType });
    if (existingInSameList) {
      res.status(400).json({
        success: false,
        error: `Product with SKU "${cleanSku}" already exists in the ${targetType === '90_PERCENT' ? '90% Price List' : 'Custom Price List'}.`,
      });
      return;
    }

    const rateNum = Number(rate) || 0;
    const discPct = targetType === '90_PERCENT' ? 90 : Number(discountPercentage) || 0;
    const discAmt = Math.round(((rateNum * discPct) / 100) * 100) / 100;
    const netRate = Math.max(0, rateNum - discAmt);

    const item = await PriceList.create({
      slNo: nextSlNo,
      sku: cleanSku,
      productName: name,
      itemName: name,
      category: category || 'General',
      priceListType: targetType,
      rate: rateNum,
      discountPercentage: discPct,
      discountAmount: discAmt,
      netRate,
      quantity: Number(quantity) || 10,
      unit: unit || 'Box',
      stock: Number(stock) || 100,
      active: active !== undefined ? Boolean(active) : true,
      batchName: batchName || (targetType === '90_PERCENT' ? '90% Price List' : 'Custom Price List'),
    });

    await syncMasterCatalog([item]);

    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/price-lists/:id
 */
export const updatePriceListItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await PriceList.findById(id);

    if (!existing) {
      res.status(404).json({ success: false, error: 'Price item not found' });
      return;
    }

    const updates = { ...req.body };
    if (updates.productName && !updates.itemName) updates.itemName = updates.productName;
    if (updates.itemName && !updates.productName) updates.productName = updates.itemName;

    const rateNum = updates.rate !== undefined ? Number(updates.rate) : existing.rate;
    const discPct = updates.discountPercentage !== undefined
      ? Number(updates.discountPercentage)
      : existing.discountPercentage;

    updates.discountAmount = Math.round(((rateNum * discPct) / 100) * 100) / 100;
    if (updates.netRate === undefined) {
      updates.netRate = Math.max(0, rateNum - updates.discountAmount);
    }

    const updated = await PriceList.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/price-lists/:id
 */
export const deletePriceListItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await PriceList.findByIdAndDelete(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Price item not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Product "${item.productName || item.itemName}" deleted from ${item.priceListType === '90_PERCENT' ? '90%' : 'Custom'} Price List.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/price-lists/clear/all?type=90_PERCENT
 */
export const clearAllPriceList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.query;
    const targetType: PriceListType =
      String(type || '').toUpperCase() === 'CUSTOM' ? 'CUSTOM' : '90_PERCENT';

    const result = await PriceList.deleteMany({ priceListType: targetType });

    res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} items from ${targetType === '90_PERCENT' ? '90% Price List' : 'Custom Price List'}.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

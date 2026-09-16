import PriceList, { IPriceListItem, PriceListType } from '../models/PriceList';
import Product from '../models/Product';

export interface CalculatedPriceResult {
  priceListId?: string;
  sku: string;
  productName: string;
  category: string;
  unit: string;
  rate: number; // MRP / Rate from the specific price list
  discountPercentage: number; // Discount % from the specific price list
  discountAmount: number; // (rate * discountPercentage) / 100
  netRate: number; // rate - discountAmount
  quantity: number;
  availableStock: number;
  priceListType: PriceListType;
  isAvailable: boolean;
  errorMessage?: string;
}

export interface CartRowInput {
  priceListId?: string;
  sku?: string;
  productName?: string;
  particular?: string; // alias for productName
  quantity: string | number;
  rate?: string | number;
  discountPercentage?: string | number;
  discountAmount?: string | number;
  netRate?: string | number;
  pktUnit?: string;
  amount?: string | number;
}

export interface CalculatedCartLine {
  priceListId?: string;
  sku: string;
  productName: string;
  particular: string;
  category: string;
  pktUnit: string;
  quantity: number;
  rate: number; // Original MRP Rate from that specific price list
  discountPercentage: number;
  discountAmount: number;
  netRate: number; // Net selling price
  amount: number; // netRate * quantity
  priceListType: PriceListType;
}

export interface ValidatedCartResult {
  lines: CalculatedCartLine[];
  subtotal: number; // Total MRP Amount
  totalDiscount: number; // Total Discount Savings
  netAmount: number; // Subtotal after product discounts
  totalCases: number;
  priceListType: PriceListType;
  errors: string[];
}

/**
 * Looks up and calculates price for a product strictly from the specified Price List.
 * Zero fallback to the other price list.
 */
export const getProductSellingPrice = async (
  identifier: { sku?: string; id?: string; name?: string },
  priceListType: PriceListType
): Promise<CalculatedPriceResult> => {
  const query: any = { priceListType, active: { $ne: false } };

  if (identifier.id) {
    query._id = identifier.id;
  } else if (identifier.sku) {
    query.sku = identifier.sku.trim().toUpperCase();
  } else if (identifier.name) {
    const cleanName = identifier.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { productName: { $regex: new RegExp(`^${cleanName}$`, 'i') } },
      { itemName: { $regex: new RegExp(`^${cleanName}$`, 'i') } },
    ];
  } else {
    return {
      sku: '',
      productName: 'Unknown Product',
      category: 'General',
      unit: 'Box',
      rate: 0,
      discountPercentage: priceListType === '90_PERCENT' ? 90 : 0,
      discountAmount: 0,
      netRate: 0,
      quantity: 1,
      availableStock: 0,
      priceListType,
      isAvailable: false,
      errorMessage: 'Invalid product identifier provided.',
    };
  }

  const priceItem = await PriceList.findOne(query);

  if (!priceItem) {
    const searchTarget = identifier.sku || identifier.name || identifier.id || 'Product';
    return {
      sku: identifier.sku || '',
      productName: identifier.name || 'Unavailable Product',
      category: 'General',
      unit: 'Box',
      rate: 0,
      discountPercentage: priceListType === '90_PERCENT' ? 90 : 0,
      discountAmount: 0,
      netRate: 0,
      quantity: 1,
      availableStock: 0,
      priceListType,
      isAvailable: false,
      errorMessage: `"${searchTarget}" is not available in the ${priceListType === '90_PERCENT' ? '90% Discount Price List' : 'Custom Discount Price List'}.`,
    };
  }

  // Fetch physical stock from master inventory
  let physicalStock = priceItem.stock || 100;
  try {
    const masterProd = await Product.findOne({ sku: priceItem.sku });
    if (masterProd && masterProd.stock !== undefined) {
      physicalStock = masterProd.stock;
    }
  } catch (err) {
    // Ignore and fallback to priceItem.stock
  }

  const rate = Number(priceItem.rate) || 0;
  const discountPercentage = Number(priceItem.discountPercentage) || (priceListType === '90_PERCENT' ? 90 : 0);
  const discountAmount = Math.round(((rate * discountPercentage) / 100) * 100) / 100;
  const netRate = priceItem.netRate > 0 ? priceItem.netRate : Math.max(0, Math.round((rate - discountAmount) * 100) / 100);

  return {
    priceListId: String(priceItem._id),
    sku: priceItem.sku,
    productName: priceItem.productName || priceItem.itemName || '',
    category: priceItem.category || 'General',
    unit: priceItem.unit || 'Box',
    rate,
    discountPercentage,
    discountAmount,
    netRate,
    quantity: priceItem.quantity || 1,
    availableStock: physicalStock,
    priceListType,
    isAvailable: true,
  };
};

/**
 * Validates and recalculates an entire cart strictly against the specified Price List.
 * Acts as backend source of truth for bill creation and price mode switching.
 */
export const validateAndCalculateCart = async (
  items: CartRowInput[],
  priceListType: PriceListType,
  checkStock: boolean = false
): Promise<ValidatedCartResult> => {
  const errors: string[] = [];
  const lines: CalculatedCartLine[] = [];

  let subtotal = 0; // Total MRP Amount
  let totalDiscount = 0; // Total Discount Savings
  let netAmount = 0; // Subtotal after discounts
  let totalCases = 0;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const qty = Math.max(0, parseFloat(String(item.quantity).replace(/,/g, '')) || 0);

    if (qty <= 0) continue;

    const identifier = {
      id: item.priceListId,
      sku: item.sku,
      name: item.productName || item.particular,
    };

    const priceResult = await getProductSellingPrice(identifier, priceListType);

    if (!priceResult.isAvailable) {
      errors.push(priceResult.errorMessage || `Product is unavailable in the selected price list.`);
      continue;
    }

    if (checkStock && priceResult.availableStock < qty) {
      errors.push(
        `Insufficient stock for "${priceResult.productName}". Available: ${priceResult.availableStock} ${priceResult.unit}, Requested: ${qty}`
      );
    }

    const lineTotal = Math.round(priceResult.netRate * qty * 100) / 100;
    const mrpLineTotal = priceResult.rate * qty;
    const discLineTotal = priceResult.discountAmount * qty;

    lines.push({
      priceListId: priceResult.priceListId,
      sku: priceResult.sku,
      productName: priceResult.productName,
      particular: priceResult.productName,
      category: priceResult.category,
      pktUnit: priceResult.unit,
      quantity: qty,
      rate: priceResult.rate,
      discountPercentage: priceResult.discountPercentage,
      discountAmount: priceResult.discountAmount,
      netRate: priceResult.netRate,
      amount: lineTotal,
      priceListType,
    });

    subtotal += mrpLineTotal;
    totalDiscount += discLineTotal;
    netAmount += lineTotal;
    totalCases += qty;
  }

  return {
    lines,
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
    totalCases,
    priceListType,
    errors,
  };
};

import type { Request, Response, NextFunction } from 'express';
import { Particular } from '../models/Particular';
import { AccountLedger } from '../models/AccountLedger';
import { Product } from '../models/Product';
import { PriceListType } from '../models/PriceList';
import { escapeRegex, recalculateCustomerBalance } from '../utils/ledgerUtils';
import { validateAndCalculateCart } from '../services/pricingService';
import { isCloudinaryConfigured, uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';

export const getParticulars = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customerName, pricingMode, priceListType, startDate, endDate } = req.query;
    const filter: any = {};

    if (customerName && typeof customerName === 'string' && customerName.trim() !== '' && customerName.toLowerCase() !== 'all') {
      filter.customerName = { $regex: new RegExp(`^${escapeRegex(customerName.trim())}$`, 'i') };
    }

    const targetType = priceListType || pricingMode;
    if (targetType && typeof targetType === 'string' && targetType !== 'ALL') {
      filter.priceListType = targetType.toUpperCase() === 'CUSTOM' ? 'CUSTOM' : '90_PERCENT';
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = String(startDate);
      if (endDate) filter.date.$lte = String(endDate);
    }

    const particulars = await Particular.find(filter).sort({ createdAt: -1, _id: -1 });
    res.status(200).json({ success: true, count: particulars.length, data: particulars });
  } catch (error) {
    next(error);
  }
};

export const getParticularById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const particular = await Particular.findById(req.params.id);
    if (!particular) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }
    res.status(200).json({ success: true, data: particular });
  } catch (error) {
    next(error);
  }
};

export const getNextBillNo = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const allParticulars = await Particular.find({}, 'billNo');
    let maxNum = 0;
    for (const p of allParticulars) {
      if (p.billNo) {
        const match = p.billNo.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    const nextBillNo = (maxNum + 1).toString().padStart(4, '0');
    res.status(200).json({ success: true, data: { nextBillNo } });
  } catch (error) {
    next(error);
  }
};

export const createParticular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      customerName,
      customerPhone,
      customerAddress,
      customerGst,
      caseCount,
      companyName,
      pricingMode,
      priceListType = '90_PERCENT',
      customDiscountPercent,
      discount,
      transport,
      packing,
      billNo,
      tax,
      amount,
      total,
      paymentStatus,
      paymentMode,
      paidAmount,
      notes,
      date,
      products = [],
    } = req.body;

    const rawType = priceListType || pricingMode || '90_PERCENT';
    const targetType: PriceListType = String(rawType).toUpperCase() === 'CUSTOM' ? 'CUSTOM' : '90_PERCENT';

    // Backend validation against PriceList records
    const cartValidation = await validateAndCalculateCart(
      products,
      targetType,
      false // non-blocking stock check
    );

    let finalBillNo = billNo ? String(billNo).trim() : '';
    if (!finalBillNo) {
      const allParticulars = await Particular.find({}, 'billNo');
      let maxNum = 0;
      for (const p of allParticulars) {
        if (p.billNo) {
          const match = p.billNo.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      finalBillNo = (maxNum + 1).toString().padStart(4, '0');
    }

    const trimmedCustName = (customerName || 'General Cash Sale').trim();

    // Auto-create / update Customer in database
    try {
      const { Customer } = await import('../models/Customer');
      const existingCustomer = await Customer.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(trimmedCustName)}$`, 'i') },
      });
      if (!existingCustomer && trimmedCustName.toLowerCase() !== 'general' && trimmedCustName.toLowerCase() !== 'general cash sale') {
        const allCusts = await Customer.find().sort({ createdAt: 1 });
        let maxId = 0;
        allCusts.forEach((c) => {
          if (c.idCode) {
            const m = c.idCode.match(/\d+/);
            if (m) {
              const n = parseInt(m[0], 10);
              if (n > maxId) maxId = n;
            }
          }
        });
        await Customer.create({
          name: trimmedCustName,
          mobile: customerPhone || '',
          address: customerAddress || '',
          gst: customerGst || '',
          idCode: `#${(maxId + 1).toString().padStart(4, '0')}`,
        });
      } else if (existingCustomer && (customerPhone || customerAddress || customerGst)) {
        if (!existingCustomer.mobile && customerPhone) existingCustomer.mobile = customerPhone;
        if (!existingCustomer.address && customerAddress) existingCustomer.address = customerAddress;
        if (!existingCustomer.gst && customerGst) existingCustomer.gst = customerGst;
        await existingCustomer.save();
      }
    } catch (custSyncErr) {
      console.warn('[Customer Sync Warn]:', custSyncErr);
    }

    // Calculations
    const backendSubtotal = cartValidation.netAmount;
    const clientTotal = parseFloat(String(total || amount || '0').replace(/,/g, '')) || 0;
    const finalSubtotal = backendSubtotal > 0 ? backendSubtotal : clientTotal;

    const discNum = parseFloat(String(discount || '0').replace(/[^0-9.]/g, '')) || 0;
    const transNum = parseFloat(String(transport || '0').replace(/[^0-9.]/g, '')) || 0;
    const packNum = parseFloat(String(packing || '0').replace(/[^0-9.]/g, '')) || 0;
    const taxNum = parseFloat(String(tax || '0').replace(/[^0-9.]/g, '')) || 0;

    let computedDiscount = 0;
    if (discNum > 0) {
      computedDiscount = String(discount || '').includes('%') ? (finalSubtotal * discNum) / 100 : discNum;
    }

    const baseForTax = Math.max(0, finalSubtotal - computedDiscount + transNum + packNum);
    const computedTax = taxNum > 0 ? (baseForTax * taxNum) / 100 : 0;
    const computedGrandTotal = Math.max(0, finalSubtotal - computedDiscount + transNum + packNum + computedTax);

    const billTotalNum = clientTotal > 0 ? clientTotal : computedGrandTotal;
    const paidNum = parseFloat(String(paidAmount || (paymentStatus === 'PAID' ? billTotalNum : '0')).replace(/,/g, '')) || 0;

    let computedStatus: 'PAID' | 'UNPAID' | 'PARTIAL' = 'UNPAID';
    if (paymentStatus === 'PAID' || (paidNum >= billTotalNum && billTotalNum > 0)) {
      computedStatus = 'PAID';
    } else if (paidNum > 0 && paidNum < billTotalNum) {
      computedStatus = 'PARTIAL';
    }

    // Line items snapshot
    const finalProductsList = cartValidation.lines.length > 0
      ? cartValidation.lines.map((line) => ({
          priceListId: line.priceListId,
          sku: line.sku,
          productName: line.productName,
          particular: line.particular,
          category: line.category,
          pktUnit: line.pktUnit,
          quantity: String(line.quantity),
          rate: String(line.rate),
          discountPercentage: String(line.discountPercentage),
          discountAmount: String(line.discountAmount),
          netRate: String(line.netRate),
          amount: String(line.amount),
          priceListType: line.priceListType,
        }))
      : (products || []).map((p: any) => ({
          sku: p.sku || '',
          productName: p.productName || p.particular || '',
          particular: p.particular || p.productName || '',
          category: p.category || 'General',
          pktUnit: p.pktUnit || 'Box',
          quantity: String(p.quantity || '1'),
          rate: String(p.rate || '0'),
          discountPercentage: String(p.discountPercentage || (targetType === '90_PERCENT' ? '90' : '30')),
          discountAmount: String(p.discountAmount || '0'),
          netRate: String(p.netRate || p.rate || '0'),
          amount: String(p.amount || '0'),
          priceListType: targetType,
        }));

    const particular = await Particular.create({
      customerName: trimmedCustName,
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      customerGst: customerGst || '',
      caseCount: caseCount || String(cartValidation.totalCases || '0'),
      companyName: companyName || 'General',
      priceListType: targetType,
      pricingMode: targetType,
      customDiscountPercent: customDiscountPercent || (targetType === 'CUSTOM' ? 40 : undefined),
      discount: discount || '0',
      transport: transport || '0',
      packing: packing || '0',
      billNo: finalBillNo,
      tax: tax || '0',
      amount: finalSubtotal.toFixed(2),
      total: billTotalNum.toFixed(2),
      paymentStatus: computedStatus,
      paymentMode: paymentMode || (computedStatus === 'PAID' ? 'CASH' : 'CREDIT'),
      paidAmount: paidNum > 0 ? paidNum.toFixed(2) : '0.00',
      notes: notes || '',
      date: date || new Date().toISOString().split('T')[0],
      products: finalProductsList,
    });

    // Deduct physical stock
    for (const item of finalProductsList) {
      const qtyNum = parseFloat(String(item.quantity)) || 0;
      if (qtyNum > 0 && item.sku) {
        await Product.findOneAndUpdate(
          { sku: item.sku.trim().toUpperCase() },
          { $inc: { stock: -qtyNum } }
        );
      }
    }

    // Ledger records
    if (billTotalNum > 0) {
      await AccountLedger.create({
        particularId: String(particular._id),
        billNo: particular.billNo,
        customerName: particular.customerName,
        date: particular.date,
        companyName: particular.companyName,
        debit: billTotalNum.toFixed(2),
        credit: '0.00',
        balance: '0.00',
        type: 'BILL',
      });
    }

    if (paidNum > 0) {
      await AccountLedger.create({
        particularId: String(particular._id),
        billNo: particular.billNo,
        customerName: particular.customerName,
        date: particular.date,
        companyName: particular.companyName,
        debit: '0.00',
        credit: paidNum.toFixed(2),
        balance: '0.00',
        type: 'PAYMENT',
      });
    }

    if (billTotalNum > 0 || paidNum > 0) {
      await recalculateCustomerBalance(particular.customerName);
    }

    res.status(201).json({ success: true, data: particular });
  } catch (error) {
    next(error);
  }
};

export const updateParticular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await Particular.findById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }

    const oldCustomerName = existing.customerName;
    const updatedParticular = await Particular.findByIdAndUpdate(id, req.body, { new: true });

    if (updatedParticular) {
      await recalculateCustomerBalance(oldCustomerName);
      if (oldCustomerName !== updatedParticular.customerName) {
        await recalculateCustomerBalance(updatedParticular.customerName);
      }
    }

    res.status(200).json({ success: true, data: updatedParticular });
  } catch (error) {
    next(error);
  }
};

export const deleteParticular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const particular = await Particular.findById(id);

    if (!particular) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }

    // Restore stock
    for (const item of particular.products || []) {
      const qtyNum = parseFloat(String(item.quantity)) || 0;
      if (qtyNum > 0 && item.sku) {
        await Product.findOneAndUpdate(
          { sku: item.sku.trim().toUpperCase() },
          { $inc: { stock: qtyNum } }
        );
      }
    }

    const customerName = particular.customerName;

    await AccountLedger.deleteMany({ particularId: String(id) });
    await Particular.findByIdAndDelete(id);

    await recalculateCustomerBalance(customerName);

    res.status(200).json({ success: true, message: 'Particular bill deleted and stock restored successfully' });
  } catch (error) {
    next(error);
  }
};

export const uploadParticularPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { pdfData, pdfName } = req.body;

    const particular = await Particular.findById(id);
    if (!particular) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }

    let finalUrl = pdfData;
    let publicId = '';

    if (isCloudinaryConfigured() && pdfData && (pdfData.startsWith('data:image') || pdfData.startsWith('data:application/pdf'))) {
      try {
        const uploadResult = await uploadToCloudinary(pdfData, 'dheeksha_trade/bills', pdfName);
        finalUrl = uploadResult.secure_url;
        publicId = uploadResult.public_id;
      } catch (cloudErr) {
        console.warn('[Cloudinary Warning] Upload failed, falling back to base64 storage:', cloudErr);
      }
    }

    particular.pdfData = finalUrl;
    particular.pdfName = pdfName || 'Receipt';
    if (publicId) particular.pdfPublicId = publicId;
    await particular.save();

    res.status(200).json({ success: true, data: particular });
  } catch (error) {
    next(error);
  }
};

export const deleteParticularPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const particular = await Particular.findById(id);
    if (!particular) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }

    if (particular.pdfPublicId) {
      await deleteFromCloudinary(particular.pdfPublicId);
    }

    particular.pdfData = '';
    particular.pdfName = '';
    particular.pdfPublicId = '';
    await particular.save();

    res.status(200).json({ success: true, data: particular });
  } catch (error) {
    next(error);
  }
};

export const getSalesSummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const allBills = await Particular.find().sort({ createdAt: -1 });

    let totalSales = 0;
    let ninetyBillsCount = 0;
    let ninetySalesTotal = 0;
    let customBillsCount = 0;
    let customSalesTotal = 0;
    let totalDiscountGiven = 0;

    const customDiscountBreakdown: Record<string, { count: number; total: number }> = {};

    for (const bill of allBills) {
      const billTotal = parseFloat(String(bill.total || bill.amount || '0').replace(/,/g, '')) || 0;
      totalSales += billTotal;

      const isCustom = (bill.priceListType || bill.pricingMode) === 'CUSTOM';

      if (isCustom) {
        customBillsCount += 1;
        customSalesTotal += billTotal;
        const discKey = `${bill.customDiscountPercent || 30}%`;
        if (!customDiscountBreakdown[discKey]) {
          customDiscountBreakdown[discKey] = { count: 0, total: 0 };
        }
        customDiscountBreakdown[discKey].count += 1;
        customDiscountBreakdown[discKey].total += billTotal;
      } else {
        ninetyBillsCount += 1;
        ninetySalesTotal += billTotal;
      }

      for (const prod of bill.products || []) {
        const qty = parseFloat(String(prod.quantity)) || 0;
        const discAmt = parseFloat(String(prod.discountAmount)) || 0;
        totalDiscountGiven += discAmt * qty;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        totalBills: allBills.length,
        totalSales: Math.round(totalSales * 100) / 100,
        totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
        ninetyMode: {
          billsCount: ninetyBillsCount,
          totalSales: Math.round(ninetySalesTotal * 100) / 100,
        },
        customMode: {
          billsCount: customBillsCount,
          totalSales: Math.round(customSalesTotal * 100) / 100,
          breakdown: customDiscountBreakdown,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

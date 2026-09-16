import { useState, useEffect, useMemo, type FC, type KeyboardEvent } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Snackbar,
  Alert,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import {
  CustomersApi,
  CompaniesApi,
  ParticularsApi,
  CustomDiscountsApi,
  PriceListsApi,
  type CustomDiscountItem,
  type PriceListItem,
  type PriceListType,
} from '../services/api';
import { getStoredSettings } from './SettingsPage';
import { BillPrintModal } from './BillPrintModal';
import type { BillPrintData } from './BillPrintTemplate';

export type BillingMode = '90_PERCENT' | 'CUSTOM';

export interface CartItem {
  id: string;
  productId?: string;
  sku: string;
  particular: string;
  category: string;
  quantity: string;
  rate: string; // Original MRP Rate
  discountPercentage: string;
  discountAmount: string;
  netRate: string; // Net selling price
  pktUnit: string;
  amount: string; // Line Total (netRate * qty)
  availableStock?: number;
}

interface ParticularsPageProps {
  initialCustomerName?: string;
}

export const ParticularsPage: FC<ParticularsPageProps> = ({ initialCustomerName }) => {
  const [storeSettings] = useState(() => getStoredSettings());

  // Pricing Mode State (90% DISCOUNT vs CUSTOM DISCOUNT)
  const [pricingMode, setPricingMode] = useState<BillingMode>('90_PERCENT');
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(40);
  const [availableCustomDiscounts, setAvailableCustomDiscounts] = useState<CustomDiscountItem[]>([]);

  // Mode Switch Confirmation Modal State
  const [pendingModeSwitch, setPendingModeSwitch] = useState<{
    targetMode: BillingMode;
    targetCustomPercent?: number;
  } | null>(null);
  const [modeConfirmDialogOpen, setModeConfirmDialogOpen] = useState(false);

  // Dropdown options
  const [customerOptions, setCustomerOptions] = useState<{ id: string; name: string; phone?: string; address?: string; gst?: string }[]>([]);
  const [companyOptions, setCompanyOptions] = useState<{ id: string; name: string }[]>([]);
  const [billingProducts, setBillingProducts] = useState<PriceListItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Bill Customer & Metadata State
  const [customerName, setCustomerName] = useState<string>(() => initialCustomerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerGst, setCustomerGst] = useState<string>('');
  const [company, setCompany] = useState<string>(() => storeSettings.companyName || 'Balaji Crackers & Fireworks');
  const [billNo, setBillNo] = useState<string>('');
  const [billDate, setBillDate] = useState<string>(() => {
    const today = new Date();
    return today.toLocaleDateString('en-GB').replace(/\//g, '-');
  });

  // Additional Charges & Taxes
  const [discount, setDiscount] = useState<string>('0');
  const [transport, setTransport] = useState<string>('0');
  const [packing, setPacking] = useState<string>('0');
  const [tax, setTax] = useState<string>('0');

  // Payment State
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'UNPAID' | 'PARTIAL'>('PAID');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK' | 'CREDIT'>('CASH');
  const [paidAmount, setPaidAmount] = useState<string>('');

  // Cart & Line Items State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedProductOption, setSelectedProductOption] = useState<PriceListItem | null>(null);
  const [entryQty, setEntryQty] = useState<string>('1');
  const [entryMrpRate, setEntryMrpRate] = useState<string>('0');
  const [entryDiscountPercent, setEntryDiscountPercent] = useState<string>('90');
  const [entryNetRate, setEntryNetRate] = useState<string>('0');
  const [entryUnit, setEntryUnit] = useState<string>('Box');

  // Saving & Print Modal
  const [savingBill, setSavingBill] = useState<boolean>(false);
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [billToPrint, setBillToPrint] = useState<BillPrintData | null>(null);

  // Toast
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load initial data
  const fetchData = async () => {
    try {
      const [custs, comps, discounts, nextBill] = await Promise.all([
        CustomersApi.getAll(),
        CompaniesApi.getAll(),
        CustomDiscountsApi.getAll(),
        ParticularsApi.getNextBillNo(),
      ]);

      if (custs) {
        setCustomerOptions(
          custs.map((c: any) => ({
            id: c._id || c.id,
            name: c.name,
            phone: c.mobile || c.phone || '',
            address: c.address || '',
            gst: c.gst || '',
          }))
        );
      }

      if (comps && comps.length > 0) {
        setCompanyOptions(comps.map((co: any) => ({ id: co._id || co.id, name: co.name })));
      }

      if (discounts && discounts.length > 0) {
        const activeDiscounts = discounts.filter((d) => d.isActive);
        setAvailableCustomDiscounts(activeDiscounts.length > 0 ? activeDiscounts : discounts);
        if (activeDiscounts.length > 0 && !activeDiscounts.some((d) => d.percentage === customDiscountPercent)) {
          setCustomDiscountPercent(activeDiscounts[0].percentage);
        }
      }

      if (nextBill?.nextBillNo && !billNo) {
        setBillNo(nextBill.nextBillNo);
      }
    } catch (err) {
      console.error('Error fetching initial billing data', err);
    }
  };

  const fetchProductsForMode = async (mode: BillingMode) => {
    setLoadingProducts(true);
    try {
      const prods = await PriceListsApi.getBillingProducts(mode as PriceListType);
      setBillingProducts(prods || []);
    } catch (err) {
      console.error('Error loading billing products', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchProductsForMode(pricingMode);
  }, []);

  // Update entry form prices when product changes
  const updateEntryFormPrices = (prod: PriceListItem | null) => {
    if (!prod) {
      setEntryMrpRate('0');
      setEntryDiscountPercent(pricingMode === '90_PERCENT' ? '90' : customDiscountPercent.toString());
      setEntryNetRate('0');
      setEntryUnit('Box');
      return;
    }

    setEntryUnit(prod.unit || 'Box');
    const mrp = Number(prod.rate || 0);
    const discPct = Number(prod.discountPercentage ?? (pricingMode === '90_PERCENT' ? 90 : customDiscountPercent));
    const net = Number(prod.netRate ?? Math.max(0, mrp * (1 - discPct / 100)));

    setEntryMrpRate(mrp.toString());
    setEntryDiscountPercent(discPct.toString());
    setEntryNetRate(net.toString());
  };

  // When selected product changes in autocomplete
  const handleProductSelect = (_event: any, newValue: PriceListItem | null) => {
    setSelectedProductOption(newValue);
    updateEntryFormPrices(newValue);
  };

  // Safe Mode Switch Request Handler
  const handleRequestModeSwitch = (targetMode: BillingMode, targetCustomPct?: number) => {
    const nextCustomPct = targetCustomPct !== undefined ? targetCustomPct : customDiscountPercent;

    if (cartItems.length > 0) {
      // Prompt confirmation before modifying existing cart
      setPendingModeSwitch({ targetMode, targetCustomPercent: nextCustomPct });
      setModeConfirmDialogOpen(true);
    } else {
      // Instant switch if cart is empty
      setPricingMode(targetMode);
      if (targetCustomPct !== undefined) setCustomDiscountPercent(targetCustomPct);
      fetchProductsForMode(targetMode);
      setSelectedProductOption(null);
      setEntryMrpRate('0');
      setEntryNetRate('0');
      setEntryDiscountPercent(targetMode === '90_PERCENT' ? '90' : nextCustomPct.toString());
    }
  };

  const handleConfirmModeSwitch = async () => {
    if (!pendingModeSwitch) return;
    const { targetMode, targetCustomPercent } = pendingModeSwitch;
    const nextCustomPct = targetCustomPercent !== undefined ? targetCustomPercent : customDiscountPercent;

    setPricingMode(targetMode);
    if (targetCustomPercent !== undefined) setCustomDiscountPercent(targetCustomPercent);

    try {
      // Load target price list products
      const targetProducts = await PriceListsApi.getBillingProducts(targetMode as PriceListType);
      setBillingProducts(targetProducts || []);

      // Recalculate all cart rows preserving quantities against target price list
      const updatedCart: CartItem[] = cartItems.map((item) => {
        const qty = parseFloat(item.quantity) || 1;
        const targetItem = (targetProducts || []).find(
          (p) =>
            (item.sku && p.sku && p.sku.toUpperCase() === item.sku.toUpperCase()) ||
            ((p.productName || p.itemName || '').toLowerCase() === item.particular.toLowerCase())
        );

        if (targetItem) {
          const mrp = Number(targetItem.rate || 0);
          const discPct = Number(targetItem.discountPercentage ?? (targetMode === '90_PERCENT' ? 90 : nextCustomPct));
          const discAmt = Number(targetItem.discountAmount ?? ((mrp * discPct) / 100));
          const netRate = Number(targetItem.netRate ?? Math.max(0, mrp - discAmt));
          const lineTotal = Math.round(netRate * qty * 100) / 100;

          return {
            ...item,
            productId: String(targetItem._id || targetItem.id),
            sku: targetItem.sku || item.sku,
            particular: targetItem.productName || targetItem.itemName || item.particular,
            rate: mrp.toString(),
            discountPercentage: discPct.toString(),
            discountAmount: discAmt.toFixed(2),
            netRate: netRate.toFixed(2),
            amount: lineTotal.toFixed(2),
            pktUnit: targetItem.unit || item.pktUnit || 'Box',
            availableStock: targetItem.stock,
          };
        } else {
          // Product does not exist in target list -> calculate using fallback mode %
          const mrp = parseFloat(item.rate) || 0;
          const discPct = targetMode === '90_PERCENT' ? 90 : nextCustomPct;
          const discAmt = (mrp * discPct) / 100;
          const net = Math.max(0, Math.round((mrp - discAmt) * 100) / 100);
          const lineTotal = Math.round(net * qty * 100) / 100;

          return {
            ...item,
            discountPercentage: discPct.toString(),
            discountAmount: discAmt.toFixed(2),
            netRate: net.toFixed(2),
            amount: lineTotal.toFixed(2),
          };
        }
      });

      setCartItems(updatedCart);
      setSelectedProductOption(null);
      setEntryMrpRate('0');
      setEntryNetRate('0');
      setEntryDiscountPercent(targetMode === '90_PERCENT' ? '90' : nextCustomPct.toString());

      setToast({
        open: true,
        message: `Switched pricing mode to ${targetMode === '90_PERCENT' ? '90% DISCOUNT PRICE LIST' : `CUSTOM DISCOUNT PRICE LIST (${nextCustomPct}%)`}. Bill recalculated!`,
        severity: 'info',
      });
    } catch (err: any) {
      console.error('Error switching pricing mode', err);
      setToast({ open: true, message: 'Failed to recalculate bill with target price list', severity: 'error' });
    } finally {
      setModeConfirmDialogOpen(false);
      setPendingModeSwitch(null);
    }
  };

  const handleCancelModeSwitch = () => {
    setModeConfirmDialogOpen(false);
    setPendingModeSwitch(null);
  };

  // Custom Discount Dropdown Change Handler
  const handleCustomDiscountDropdownChange = (newPct: number) => {
    if (cartItems.length > 0) {
      setPendingModeSwitch({ targetMode: 'CUSTOM', targetCustomPercent: newPct });
      setModeConfirmDialogOpen(true);
    } else {
      setCustomDiscountPercent(newPct);
      setEntryDiscountPercent(newPct.toString());
      if (selectedProductOption) {
        updateEntryFormPrices(selectedProductOption);
      }
    }
  };

  // Add Product to Cart
  const handleAddToCart = () => {
    if (!selectedProductOption) {
      setToast({ open: true, message: 'Please select a cracker product to add.', severity: 'warning' });
      return;
    }

    const qtyNum = parseFloat(entryQty) || 1;
    if (qtyNum <= 0) {
      setToast({ open: true, message: 'Quantity must be at least 1.', severity: 'error' });
      return;
    }

    const mrpNum = parseFloat(entryMrpRate) || Number(selectedProductOption.rate || 0);
    const discPct = parseFloat(entryDiscountPercent) || Number(selectedProductOption.discountPercentage ?? (pricingMode === '90_PERCENT' ? 90 : customDiscountPercent));
    const discAmt = (mrpNum * discPct) / 100;
    const netRateNum = parseFloat(entryNetRate) || Number(selectedProductOption.netRate ?? Math.max(0, mrpNum - discAmt));
    const lineTotal = Math.round(netRateNum * qtyNum * 100) / 100;

    // Check if item already exists in cart -> increment quantity
    const existingIndex = cartItems.findIndex(
      (item) =>
        (item.productId && (item.productId === selectedProductOption._id || item.productId === selectedProductOption.id)) ||
        (item.sku && selectedProductOption.sku && item.sku.toUpperCase() === selectedProductOption.sku.toUpperCase()) ||
        item.particular.toLowerCase() === (selectedProductOption.productName || selectedProductOption.itemName || '').toLowerCase()
    );

    if (existingIndex > -1) {
      const updated = [...cartItems];
      const currentQty = parseFloat(updated[existingIndex].quantity) || 0;
      const newTotalQty = currentQty + qtyNum;
      const updatedTotal = Math.round(netRateNum * newTotalQty * 100) / 100;

      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newTotalQty.toString(),
        amount: updatedTotal.toFixed(2),
      };
      setCartItems(updated);
    } else {
      const newItem: CartItem = {
        id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        productId: String(selectedProductOption._id || selectedProductOption.id),
        sku: selectedProductOption.sku || `CK-${String(cartItems.length + 1).padStart(3, '0')}`,
        particular: selectedProductOption.productName || selectedProductOption.itemName || 'Cracker Item',
        category: selectedProductOption.category || 'General',
        quantity: qtyNum.toString(),
        rate: mrpNum.toString(),
        discountPercentage: discPct.toString(),
        discountAmount: discAmt.toFixed(2),
        netRate: netRateNum.toFixed(2),
        pktUnit: entryUnit || selectedProductOption.unit || 'Box',
        amount: lineTotal.toFixed(2),
        availableStock: selectedProductOption.stock,
      };
      setCartItems((prev) => [...prev, newItem]);
    }

    // Reset Entry input
    setSelectedProductOption(null);
    setEntryQty('1');
    setEntryMrpRate('0');
    setEntryNetRate('0');
  };

  const handleCartQtyChange = (index: number, newQty: string) => {
    const updated = [...cartItems];
    const qtyNum = parseFloat(newQty) || 0;
    const netRateNum = parseFloat(updated[index].netRate) || 0;
    const lineTotal = Math.round(netRateNum * qtyNum * 100) / 100;

    updated[index] = {
      ...updated[index],
      quantity: newQty,
      amount: lineTotal.toFixed(2),
    };
    setCartItems(updated);
  };

  const handleRemoveCartItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClearCart = () => {
    if (cartItems.length > 0 && !window.confirm('Are you sure you want to clear all items in this bill?')) {
      return;
    }
    setCartItems([]);
  };

  // Cart Calculations
  const calculations = useMemo(() => {
    let subtotalMrp = 0;
    let totalDiscountAmount = 0;
    let netSubtotal = 0;
    let totalCases = 0;

    cartItems.forEach((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const mrp = parseFloat(item.rate) || 0;
      const discAmt = parseFloat(item.discountAmount) || 0;
      const netRate = parseFloat(item.netRate) || 0;

      subtotalMrp += mrp * qty;
      totalDiscountAmount += discAmt * qty;
      netSubtotal += netRate * qty;
      totalCases += qty;
    });

    const discNum = parseFloat(discount.replace(/[^0-9.]/g, '')) || 0;
    const transNum = parseFloat(transport.replace(/[^0-9.]/g, '')) || 0;
    const packNum = parseFloat(packing.replace(/[^0-9.]/g, '')) || 0;
    const taxNum = parseFloat(tax.replace(/[^0-9.]/g, '')) || 0;

    let billLevelDiscount = 0;
    if (discNum > 0) {
      billLevelDiscount = discount.includes('%') ? (netSubtotal * discNum) / 100 : discNum;
    }

    const baseForTax = Math.max(0, netSubtotal - billLevelDiscount + transNum + packNum);
    const taxAmount = taxNum > 0 ? (baseForTax * taxNum) / 100 : 0;
    const grandTotal = Math.max(0, netSubtotal - billLevelDiscount + transNum + packNum + taxAmount);

    return {
      subtotalMrp: Math.round(subtotalMrp * 100) / 100,
      totalDiscountAmount: Math.round(totalDiscountAmount * 100) / 100,
      netSubtotal: Math.round(netSubtotal * 100) / 100,
      billLevelDiscount: Math.round(billLevelDiscount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      totalCases,
    };
  }, [cartItems, discount, transport, packing, tax]);

  // Customer Autocomplete selection
  const handleCustomerSelect = (_event: any, newValue: any) => {
    if (typeof newValue === 'string') {
      setCustomerName(newValue);
    } else if (newValue && newValue.name) {
      setCustomerName(newValue.name);
      if (newValue.phone) setCustomerPhone(newValue.phone);
      if (newValue.address) setCustomerAddress(newValue.address);
      if (newValue.gst) setCustomerGst(newValue.gst);
    } else {
      setCustomerName('');
    }
  };

  // Save Bill to Backend
  const handleSaveBill = async (autoPrint: boolean = false) => {
    if (!customerName.trim()) {
      setToast({ open: true, message: 'Please enter a customer name.', severity: 'error' });
      return;
    }

    if (cartItems.length === 0) {
      setToast({ open: true, message: 'Please add at least one product to the bill.', severity: 'error' });
      return;
    }

    setSavingBill(true);

    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        customerGst: customerGst.trim(),
        caseCount: calculations.totalCases.toString(),
        companyName: company || storeSettings.companyName || 'Balaji Crackers & Fireworks',
        pricingMode,
        customDiscountPercent: pricingMode === 'CUSTOM' ? customDiscountPercent : undefined,
        discount,
        transport,
        packing,
        tax,
        billNo: billNo || undefined,
        amount: calculations.netSubtotal.toFixed(2),
        total: calculations.grandTotal.toFixed(2),
        paymentStatus,
        paymentMode,
        paidAmount: paidAmount || (paymentStatus === 'PAID' ? calculations.grandTotal.toFixed(2) : '0.00'),
        date: billDate,
        products: cartItems.map((item) => ({
          productId: item.productId,
          sku: item.sku,
          particular: item.particular,
          category: item.category,
          quantity: item.quantity,
          rate: item.rate,
          discountPercentage: item.discountPercentage,
          discountAmount: item.discountAmount,
          netRate: item.netRate,
          pktUnit: item.pktUnit,
          amount: item.amount,
        })),
      };

      const savedBill = await ParticularsApi.create(payload);

      setToast({
        open: true,
        message: `Bill #${savedBill.billNo} saved successfully in ${pricingMode === '90_PERCENT' ? '90% DISCOUNT' : 'CUSTOM DISCOUNT'} mode!`,
        severity: 'success',
      });

      // Prepare print data
      const printData: BillPrintData = {
        billNo: savedBill.billNo,
        date: savedBill.date,
        customerName: savedBill.customerName,
        customerPhone: savedBill.customerPhone,
        customerAddress: savedBill.customerAddress,
        customerGst: savedBill.customerGst,
        companyName: savedBill.companyName,
        caseCount: savedBill.caseCount,
        products: (savedBill.products || []).map((p: any) => ({
          particular: p.particular,
          quantity: p.quantity,
          rate: p.rate,
          pktUnit: p.pktUnit,
          amount: p.amount,
        })),
        amount: savedBill.amount,
        discount: savedBill.discount,
        transport: savedBill.transport,
        packing: savedBill.packing,
        tax: savedBill.tax,
        total: savedBill.total,
        paymentStatus: savedBill.paymentStatus,
        paymentMode: savedBill.paymentMode,
        paidAmount: savedBill.paidAmount,
      };

      setBillToPrint(printData);

      if (autoPrint) {
        setPrintModalOpen(true);
      }

      // Reset for next bill
      setCartItems([]);
      setSelectedProductOption(null);
      fetchData(); // Fetch next bill no
    } catch (err: any) {
      setToast({ open: true, message: err.message || 'Failed to save bill', severity: 'error' });
    } finally {
      setSavingBill(false);
    }
  };

  const handleManualPrintPreview = () => {
    if (cartItems.length === 0) {
      setToast({ open: true, message: 'Please add products before printing preview.', severity: 'warning' });
      return;
    }

    const previewData: BillPrintData = {
      billNo: billNo || 'PREVIEW',
      date: billDate,
      customerName: customerName || 'General Cash Sale',
      customerPhone,
      customerAddress,
      customerGst,
      companyName: company || storeSettings.companyName || 'Balaji Crackers & Fireworks',
      caseCount: calculations.totalCases,
      products: cartItems.map((p) => ({
        particular: p.particular,
        quantity: p.quantity,
        rate: p.netRate,
        pktUnit: p.pktUnit,
        amount: p.amount,
      })),
      amount: calculations.netSubtotal,
      discount,
      transport,
      packing,
      tax,
      total: calculations.grandTotal,
      paymentStatus,
      paymentMode,
      paidAmount: paidAmount || (paymentStatus === 'PAID' ? calculations.grandTotal : 0),
    };

    setBillToPrint(previewData);
    setPrintModalOpen(true);
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1400, margin: '0 auto' }}>
      {/* TOP HERO: PRICING MODE SELECTOR & BILLING HEADER */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: 2.5,
          borderRadius: '16px',
          border: '2px solid',
          borderColor: pricingMode === '90_PERCENT' ? '#FCA5A5' : '#93C5FD',
          background: pricingMode === '90_PERCENT'
            ? 'linear-gradient(135deg, #FFF1F2 0%, #FFFFFF 100%)'
            : 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          {/* Billing Title & Active Mode Status */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ReceiptLongRoundedIcon sx={{ fontSize: 32, color: pricingMode === '90_PERCENT' ? '#DC2626' : '#2563EB' }} />
              <div>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  CRACKERS BILLING DESK
                </Typography>
                <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                  <span>Current Pricing:</span>
                  <strong style={{ color: pricingMode === '90_PERCENT' ? '#DC2626' : '#2563EB', fontSize: '14px' }}>
                    {pricingMode === '90_PERCENT'
                      ? '90% DISCOUNT (Standard Net Rate)'
                      : `CUSTOM DISCOUNT (${customDiscountPercent}% APPLIED)`}
                  </strong>
                </Typography>
              </div>
            </Box>
          </Box>

          {/* Pricing Mode Toggle Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box
              sx={{
                display: 'flex',
                p: 0.6,
                borderRadius: '14px',
                backgroundColor: '#FFFFFF',
                border: '2px solid #CBD5E1',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                gap: 1,
              }}
            >
              {/* 90% DISCOUNT BUTTON */}
              <Button
                onClick={() => handleRequestModeSwitch('90_PERCENT')}
                sx={{
                  px: 3,
                  py: 1.2,
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '14px',
                  textTransform: 'none',
                  letterSpacing: '0.02em',
                  backgroundColor: pricingMode === '90_PERCENT' ? '#DC2626' : '#F8FAFC',
                  color: pricingMode === '90_PERCENT' ? '#FFFFFF' : '#64748B',
                  boxShadow: pricingMode === '90_PERCENT' ? '0 4px 14px rgba(220, 38, 38, 0.4)' : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: pricingMode === '90_PERCENT' ? '#B91C1C' : '#F1F5F9',
                  },
                }}
              >
                {pricingMode === '90_PERCENT' && '🟢 '}90% DISCOUNT
              </Button>

              {/* CUSTOM DISCOUNT BUTTON */}
              <Button
                onClick={() => handleRequestModeSwitch('CUSTOM')}
                sx={{
                  px: 3,
                  py: 1.2,
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '14px',
                  textTransform: 'none',
                  letterSpacing: '0.02em',
                  backgroundColor: pricingMode === 'CUSTOM' ? '#2563EB' : '#F8FAFC',
                  color: pricingMode === 'CUSTOM' ? '#FFFFFF' : '#64748B',
                  boxShadow: pricingMode === 'CUSTOM' ? '0 4px 14px rgba(37, 99, 235, 0.4)' : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: pricingMode === 'CUSTOM' ? '#1D4ED8' : '#F1F5F9',
                  },
                }}
              >
                {pricingMode === 'CUSTOM' && '🟡 '}CUSTOM DISCOUNT
              </Button>
            </Box>

            {/* Custom Discount Percentage Selector Dropdown (When CUSTOM is active) */}
            {pricingMode === 'CUSTOM' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="custom-disc-label" sx={{ fontWeight: 700, color: '#1E40AF' }}>
                    Discount %
                  </InputLabel>
                  <Select
                    labelId="custom-disc-label"
                    label="Discount %"
                    value={customDiscountPercent}
                    onChange={(e) => handleCustomDiscountDropdownChange(Number(e.target.value))}
                    sx={{
                      borderRadius: '10px',
                      fontWeight: 900,
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                      color: '#1E40AF',
                      border: '1.5px solid #93C5FD',
                    }}
                  >
                    {availableCustomDiscounts.map((disc) => (
                      <MenuItem key={disc.percentage} value={disc.percentage} sx={{ fontWeight: 700 }}>
                        {disc.percentage}% Discount
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* SECTION 1: CUSTOMER & BILL DETAILS */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 2.5,
          borderRadius: '14px',
          border: '1.5px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Grid container spacing={2}>
          {/* Customer Name Autocomplete */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Autocomplete
              freeSolo
              options={customerOptions}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
              value={customerName}
              onInputChange={(_e, newInputValue) => setCustomerName(newInputValue)}
              onChange={handleCustomerSelect}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Customer / Party Name"
                  placeholder="Type or select customer..."
                  size="small"
                  required
                />
              )}
            />
          </Grid>

          {/* Mobile Number */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Mobile Number"
              placeholder="+91 98765 43210"
              size="small"
              fullWidth
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </Grid>

          {/* Bill Number */}
          <Grid size={{ xs: 6, sm: 6, md: 2.5 }}>
            <TextField
              label="Bill Number"
              size="small"
              fullWidth
              value={billNo}
              onChange={(e) => setBillNo(e.target.value)}
              sx={{ backgroundColor: '#FEF3C7', borderRadius: '4px' }}
            />
          </Grid>

          {/* Bill Date */}
          <Grid size={{ xs: 6, sm: 6, md: 2.5 }}>
            <TextField
              label="Bill Date"
              size="small"
              fullWidth
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
            />
          </Grid>

          {/* Company Selection */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl size="small" fullWidth>
              <InputLabel id="bill-company-label">Billed From (Company)</InputLabel>
              <Select
                labelId="bill-company-label"
                label="Billed From (Company)"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              >
                {companyOptions.map((co) => (
                  <MenuItem key={co.id} value={co.name}>
                    {co.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Customer Address & GST */}
          <Grid size={{ xs: 12, sm: 6, md: 5 }}>
            <TextField
              label="Customer Address / Destination"
              placeholder="e.g. 45, Gandhi Road, Salem, Tamil Nadu"
              size="small"
              fullWidth
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 12, md: 3 }}>
            <TextField
              label="Customer GSTIN (Optional)"
              placeholder="e.g. 33AABCS1111A1Z1"
              size="small"
              fullWidth
              value={customerGst}
              onChange={(e) => setCustomerGst(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* SECTION 2: PRODUCT SEARCH & ADD TO BILL */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 2.5,
          borderRadius: '14px',
          border: '1.5px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCartRoundedIcon sx={{ fontSize: 18, color: pricingMode === '90_PERCENT' ? '#DC2626' : '#2563EB' }} />
          Product Quick Search & Add ({pricingMode === '90_PERCENT' ? '90% Net Rate Mode' : `Custom ${customDiscountPercent}% Mode`})
        </Typography>

        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          {/* Product Autocomplete */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Autocomplete
              options={billingProducts}
              getOptionLabel={(p) =>
                `${p.sku ? `[${p.sku}] ` : ''}${p.productName || p.itemName} - MRP ₹${Number(p.rate || 0).toFixed(2)} | Net ₹${Number(p.netRate || 0).toFixed(2)}`
              }
              value={selectedProductOption}
              onChange={handleProductSelect}
              loading={loadingProducts}
              renderOption={(props, option) => {
                const mrp = Number(option.rate || 0);
                const disc = Number(option.discountPercentage ?? (pricingMode === '90_PERCENT' ? 90 : customDiscountPercent));
                const net = Number(option.netRate ?? Math.max(0, mrp * (1 - disc / 100)));

                return (
                  <li {...props} key={option._id || option.id || option.sku}>
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>
                          <span style={{ color: '#64748B', fontSize: '12px', marginRight: '6px' }}>[{option.sku}]</span>
                          {option.productName || option.itemName}
                        </Typography>
                        <Typography sx={{ fontSize: '11.5px', color: '#64748B' }}>
                          Category: {option.category || 'General'} | Stock: {option.stock ?? 100} {option.unit || 'Box'}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '12px', color: '#94A3B8', textDecoration: 'line-through' }}>
                          MRP: ₹{mrp.toFixed(2)}
                        </Typography>
                        <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: pricingMode === '90_PERCENT' ? '#DC2626' : '#2563EB' }}>
                          Net: ₹{net.toFixed(2)} ({disc}% Off)
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={`Search ${pricingMode === '90_PERCENT' ? '90%' : 'Custom'} Cracker Product / SKU`}
                  placeholder="Type product name or SKU..."
                  size="small"
                  autoFocus
                />
              )}
            />
          </Grid>

          {/* Quantity */}
          <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
            <TextField
              label="Quantity"
              type="number"
              size="small"
              fullWidth
              value={entryQty}
              onChange={(e) => setEntryQty(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter') handleAddToCart();
              }}
            />
          </Grid>

          {/* MRP Rate */}
          <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
            <TextField
              label="Rate (MRP)"
              size="small"
              fullWidth
              disabled
              value={`₹${entryMrpRate}`}
              sx={{ backgroundColor: '#F8FAFC' }}
            />
          </Grid>

          {/* Discount % */}
          <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
            <TextField
              label="Disc %"
              size="small"
              fullWidth
              disabled
              value={`${entryDiscountPercent}%`}
              sx={{ backgroundColor: '#F8FAFC' }}
            />
          </Grid>

          {/* Net Rate */}
          <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
            <TextField
              label="Net Rate"
              size="small"
              fullWidth
              disabled
              value={`₹${entryNetRate}`}
              sx={{ backgroundColor: pricingMode === '90_PERCENT' ? '#FEE2E2' : '#DBEAFE', borderRadius: '4px' }}
            />
          </Grid>

          {/* Add Button */}
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<AddRoundedIcon />}
              onClick={handleAddToCart}
              sx={{
                py: 1,
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '13.5px',
                textTransform: 'none',
                backgroundColor: pricingMode === '90_PERCENT' ? '#DC2626' : '#2563EB',
                '&:hover': {
                  backgroundColor: pricingMode === '90_PERCENT' ? '#B91C1C' : '#1D4ED8',
                },
              }}
            >
              Add to Bill
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* SECTION 3: BILL CART TABLE */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '14px',
          border: '1.5px solid #E2E8F0',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          mb: 2.5,
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B' }}>
            Bill Line Items ({cartItems.length} Products, {calculations.totalCases} Total Cases)
          </Typography>
          {cartItems.length > 0 && (
            <Button
              size="small"
              variant="text"
              startIcon={<ClearRoundedIcon />}
              onClick={handleClearCart}
              sx={{ color: '#DC2626', fontWeight: 700, textTransform: 'none' }}
            >
              Clear Cart
            </Button>
          )}
        </Box>

        <TableContainer sx={{ maxHeight: 420 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F1F5F9' }}>
                <TableCell sx={{ fontWeight: 800, color: '#334155', width: '50px' }}>S.No</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155', width: '90px' }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Product / Particulars</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, color: '#334155', width: '100px' }}>Quantity</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, color: '#334155', width: '80px' }}>Unit</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#334155', width: '110px' }}>MRP Rate</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, color: '#334155', width: '90px' }}>Disc %</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#334155', width: '110px' }}>Disc Amt</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#334155', width: '110px', backgroundColor: pricingMode === '90_PERCENT' ? '#FEE2E2' : '#DBEAFE' }}>
                  Net Rate
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#334155', width: '130px' }}>Total Amount</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, color: '#334155', width: '60px' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cartItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                    <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#64748B' }}>
                      Bill is empty. Use the product search above to add crackers.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                cartItems.map((item, idx) => {
                  const qtyNum = parseFloat(item.quantity) || 0;
                  const stockAlert = item.availableStock !== undefined && item.availableStock < qtyNum;

                  return (
                    <TableRow key={item.id} hover sx={{ borderBottom: '1px solid #F1F5F9' }}>
                      <TableCell sx={{ fontWeight: 700, color: '#64748B' }}>{idx + 1}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.sku}
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '11px', backgroundColor: '#F1F5F9', color: '#334155' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>
                          {item.particular}
                        </Typography>
                        {stockAlert && (
                          <Typography sx={{ fontSize: '11px', color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <WarningAmberRoundedIcon sx={{ fontSize: 13 }} />
                            Stock low: Only {item.availableStock} in inventory
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={item.quantity}
                          onChange={(e) => handleCartQtyChange(idx, e.target.value)}
                          sx={{ width: '80px', '& input': { textAlign: 'center', fontWeight: 700, py: 0.5 } }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ color: '#64748B', fontWeight: 600 }}>
                        {item.pktUnit}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#64748B' }}>
                        ₹{parseFloat(item.rate).toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${item.discountPercentage}%`}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: '11px',
                            backgroundColor: pricingMode === '90_PERCENT' ? '#DC2626' : '#2563EB',
                            color: '#FFFFFF',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ color: '#DC2626', fontWeight: 600 }}>
                        -₹{parseFloat(item.discountAmount).toFixed(2)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 800,
                          fontSize: '13.5px',
                          color: pricingMode === '90_PERCENT' ? '#991B1B' : '#1E40AF',
                          backgroundColor: pricingMode === '90_PERCENT' ? '#FEF2F2' : '#EFF6FF',
                        }}
                      >
                        ₹{parseFloat(item.netRate).toFixed(2)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, fontSize: '14px', color: '#0F172A' }}>
                        ₹{parseFloat(item.amount).toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => handleRemoveCartItem(idx)} sx={{ color: '#DC2626' }}>
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* SECTION 4: BILLING TOTALS, CHARGES & ACTION CONTROLS */}
      <Grid container spacing={2.5}>
        {/* Left: Charges & Payment Controls */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '14px',
              border: '1.5px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              height: '100%',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', mb: 2 }}>
              Additional Bill Charges & Payment
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  label="Extra Discount"
                  size="small"
                  fullWidth
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0 or 5%"
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  label="Transport (₹)"
                  size="small"
                  fullWidth
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  label="Packing (₹)"
                  size="small"
                  fullWidth
                  value={packing}
                  onChange={(e) => setPacking(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  label="GST / Tax (%)"
                  size="small"
                  fullWidth
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="payment-mode-label">Payment Mode</InputLabel>
                  <Select
                    labelId="payment-mode-label"
                    label="Payment Mode"
                    value={paymentMode}
                    onChange={(e: any) => setPaymentMode(e.target.value)}
                  >
                    <MenuItem value="CASH">Cash Payment</MenuItem>
                    <MenuItem value="UPI">UPI / GPay / PhonePe</MenuItem>
                    <MenuItem value="BANK">Bank Transfer / NEFT</MenuItem>
                    <MenuItem value="CREDIT">Credit / Ledger</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="payment-status-label">Payment Status</InputLabel>
                  <Select
                    labelId="payment-status-label"
                    label="Payment Status"
                    value={paymentStatus}
                    onChange={(e: any) => setPaymentStatus(e.target.value)}
                  >
                    <MenuItem value="PAID">Full Paid</MenuItem>
                    <MenuItem value="PARTIAL">Partial Paid</MenuItem>
                    <MenuItem value="UNPAID">Unpaid / Due</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Amount Received (₹)"
                  size="small"
                  fullWidth
                  value={paidAmount}
                  placeholder={paymentStatus === 'PAID' ? calculations.grandTotal.toFixed(2) : '0'}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Right: Grand Summary Card & Save Actions */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '14px',
              border: '2px solid',
              borderColor: pricingMode === '90_PERCENT' ? '#FCA5A5' : '#93C5FD',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', mb: 1.5 }}>
              Bill Calculation Summary ({pricingMode === '90_PERCENT' ? '90% Mode' : `Custom ${customDiscountPercent}% Mode`})
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ color: '#64748B', fontSize: '13px', fontWeight: 600 }}>Total MRP Value:</Typography>
              <Typography sx={{ color: '#64748B', fontSize: '13px', fontWeight: 700, textDecoration: 'line-through' }}>
                ₹{calculations.subtotalMrp.toFixed(2)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ color: '#DC2626', fontSize: '13px', fontWeight: 700 }}>
                Total Crackers Discount Savings:
              </Typography>
              <Typography sx={{ color: '#DC2626', fontSize: '13px', fontWeight: 800 }}>
                -₹{calculations.totalDiscountAmount.toFixed(2)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ color: '#334155', fontSize: '13.5px', fontWeight: 700 }}>Net Items Total:</Typography>
              <Typography sx={{ color: '#334155', fontSize: '13.5px', fontWeight: 800 }}>
                ₹{calculations.netSubtotal.toFixed(2)}
              </Typography>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontSize: '17px', fontWeight: 900, color: '#0F172A' }}>
                GRAND TOTAL:
              </Typography>
              <Typography sx={{ fontSize: '24px', fontWeight: 900, color: pricingMode === '90_PERCENT' ? '#DC2626' : '#2563EB' }}>
                ₹{calculations.grandTotal.toFixed(2)}
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="contained"
                fullWidth
                disabled={savingBill || cartItems.length === 0}
                onClick={() => handleSaveBill(false)}
                sx={{
                  py: 1.2,
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '14px',
                  textTransform: 'none',
                  backgroundColor: '#059669',
                  '&:hover': { backgroundColor: '#047857' },
                }}
              >
                {savingBill ? 'Saving...' : 'Save Bill'}
              </Button>

              <Button
                variant="contained"
                fullWidth
                disabled={savingBill || cartItems.length === 0}
                onClick={() => handleSaveBill(true)}
                startIcon={<PrintOutlinedIcon />}
                sx={{
                  py: 1.2,
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '14px',
                  textTransform: 'none',
                  backgroundColor: pricingMode === '90_PERCENT' ? '#DC2626' : '#2563EB',
                  '&:hover': {
                    backgroundColor: pricingMode === '90_PERCENT' ? '#B91C1C' : '#1D4ED8',
                  },
                }}
              >
                Save & Print
              </Button>

              <Button
                variant="outlined"
                onClick={handleManualPrintPreview}
                sx={{
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  textTransform: 'none',
                  borderColor: '#64748B',
                  color: '#334155',
                }}
              >
                Preview
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* MODE SWITCH SAFETY CONFIRMATION DIALOG */}
      <Dialog open={modeConfirmDialogOpen} onClose={handleCancelModeSwitch} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#B91C1C', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberRoundedIcon sx={{ color: '#DC2626' }} />
          Switch Pricing Mode?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '14px', color: '#334155', mb: 1.5, fontWeight: 500 }}>
            Changing the price mode may update the prices of items in the current bill. Do you want to continue?
          </Typography>
          <Box sx={{ p: 1.5, backgroundColor: '#FEF3C7', borderRadius: '8px', border: '1px solid #FDE68A' }}>
            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#92400E' }}>
              • Target Mode: {pendingModeSwitch?.targetMode === '90_PERCENT' ? '90% DISCOUNT' : `CUSTOM DISCOUNT (${pendingModeSwitch?.targetCustomPercent}%)`}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#78350F', mt: 0.5 }}>
              • Quantities will be preserved. Net rates and totals will be automatically recalculated.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancelModeSwitch} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmModeSwitch}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              backgroundColor: pendingModeSwitch?.targetMode === '90_PERCENT' ? '#DC2626' : '#2563EB',
            }}
          >
            Continue & Recalculate
          </Button>
        </DialogActions>
      </Dialog>

      {/* PRINT PREVIEW MODAL */}
      {printModalOpen && billToPrint && (
        <BillPrintModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          bill={billToPrint}
        />
      )}

      {/* TOAST SNACKBAR */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%', fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ParticularsPage;

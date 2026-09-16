import { useState, useEffect, useMemo, useRef, type FC, type ChangeEvent } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  InputBase,
  Chip,
  MenuItem,
  Select,
  FormControl,
  Grid,
  Checkbox,
  FormControlLabel,
  Snackbar,
  Alert,
  Switch,
} from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ModeEditOutlineRoundedIcon from '@mui/icons-material/ModeEditOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PercentRoundedIcon from '@mui/icons-material/PercentRounded';
import SettingsSuggestRoundedIcon from '@mui/icons-material/SettingsSuggestRounded';
import * as XLSX from 'xlsx';
import {
  PriceListsApi,
  CategoriesApi,
  CustomDiscountsApi,
  type PriceListItem,
  type PriceListType,
  type CustomDiscountItem,
} from '../services/api';

export type PriceTab = '90_PERCENT' | 'CUSTOM' | 'DISCOUNTS';

export const PriceListPage: FC = () => {
  const [activeTab, setActiveTab] = useState<PriceTab>('90_PERCENT');
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [categories, setCategories] = useState<{ name: string; color?: string }[]>([]);
  const [customDiscounts, setCustomDiscounts] = useState<CustomDiscountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Excel Upload Modal State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<Partial<PriceListItem>[]>([]);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadBatchName, setUploadBatchName] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // Manual Add / Edit Item Modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceListItem | null>(null);
  const [formSlNo, setFormSlNo] = useState<number>(1);
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formRate, setFormRate] = useState<string>('100');
  const [formDiscountPercentage, setFormDiscountPercentage] = useState<string>('90');
  const [formDiscountAmount, setFormDiscountAmount] = useState<string>('90');
  const [formNetRate, setFormNetRate] = useState<string>('10');
  const [formQuantity, setFormQuantity] = useState<string>('10');
  const [formUnit, setFormUnit] = useState('Box');
  const [formStock, setFormStock] = useState<string>('100');
  const [savingItem, setSavingItem] = useState(false);

  // Discount Tier Add / Edit Modal
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<CustomDiscountItem | null>(null);
  const [discountPercentageInput, setDiscountPercentageInput] = useState('');
  const [discountLabelInput, setDiscountLabelInput] = useState('');
  const [savingDiscount, setSavingDiscount] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchCategories = async () => {
    try {
      const data = await CategoriesApi.getAll();
      setCategories(data || []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchCustomDiscounts = async () => {
    try {
      const data = await CustomDiscountsApi.getAll();
      setCustomDiscounts(data || []);
    } catch (err) {
      console.error('Failed to load custom discounts', err);
    }
  };

  const fetchPriceListItems = async (type: PriceListType) => {
    setLoading(true);
    try {
      const data = await PriceListsApi.getByType(type);
      setItems(data || []);
    } catch (err) {
      console.error(`Failed to load ${type} price list items:`, err);
      setToast({
        open: true,
        message: `Failed to load ${type === '90_PERCENT' ? '90%' : 'Custom'} price list.`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchCustomDiscounts();
  }, []);

  useEffect(() => {
    if (activeTab === '90_PERCENT' || activeTab === 'CUSTOM') {
      fetchPriceListItems(activeTab);
    }
  }, [activeTab]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchSearch =
        !searchTerm.trim() ||
        (item.productName && item.productName.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        (item.itemName && item.itemName.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase().trim()));
      return matchCategory && matchSearch;
    });
  }, [items, selectedCategory, searchTerm]);

  // Recalculate discount & net rate live in modal
  const handleRateChange = (val: string) => {
    setFormRate(val);
    const rateNum = parseFloat(val) || 0;
    const discPct = parseFloat(formDiscountPercentage) || (activeTab === '90_PERCENT' ? 90 : 30);
    const discAmt = Math.round(((rateNum * discPct) / 100) * 100) / 100;
    const net = Math.max(0, Math.round((rateNum - discAmt) * 100) / 100);
    setFormDiscountAmount(discAmt.toString());
    setFormNetRate(net.toString());
  };

  const handleDiscountPercentageChange = (val: string) => {
    setFormDiscountPercentage(val);
    const rateNum = parseFloat(formRate) || 0;
    const discPct = parseFloat(val) || 0;
    const discAmt = Math.round(((rateNum * discPct) / 100) * 100) / 100;
    const net = Math.max(0, Math.round((rateNum - discAmt) * 100) / 100);
    setFormDiscountAmount(discAmt.toString());
    setFormNetRate(net.toString());
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    const defaultDisc = activeTab === '90_PERCENT' ? '90' : '40';
    setFormSlNo(items.length + 1);
    setFormSku(`FP${String(items.length + 1001)}`);
    setFormName('');
    setFormCategory(categories[0]?.name || 'General');
    setFormRate('100');
    setFormDiscountPercentage(defaultDisc);
    const discAmt = (100 * parseFloat(defaultDisc)) / 100;
    setFormDiscountAmount(discAmt.toString());
    setFormNetRate((100 - discAmt).toString());
    setFormQuantity('10');
    setFormUnit('Box');
    setFormStock('100');
    setItemModalOpen(true);
  };

  const handleOpenEditModal = (item: PriceListItem) => {
    setEditingItem(item);
    setFormSlNo(item.slNo || 1);
    setFormSku(item.sku);
    setFormName(item.productName || item.itemName || '');
    setFormCategory(item.category || 'General');
    setFormRate(item.rate?.toString() || '0');
    setFormDiscountPercentage(
      item.discountPercentage !== undefined
        ? item.discountPercentage.toString()
        : activeTab === '90_PERCENT'
        ? '90'
        : '30'
    );
    setFormDiscountAmount(item.discountAmount?.toString() || '0');
    setFormNetRate(item.netRate?.toString() || '0');
    setFormQuantity(item.quantity?.toString() || '10');
    setFormUnit(item.unit || 'Box');
    setFormStock(item.stock?.toString() || '100');
    setItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!formName.trim()) {
      setToast({ open: true, message: 'Please enter a product name.', severity: 'error' });
      return;
    }
    if (!formSku.trim()) {
      setToast({ open: true, message: 'Please enter a SKU / Product code.', severity: 'error' });
      return;
    }

    const currentType: PriceListType = activeTab === 'CUSTOM' ? 'CUSTOM' : '90_PERCENT';
    const rateNum = parseFloat(formRate) || 0;
    const discPct = currentType === '90_PERCENT' ? 90 : parseFloat(formDiscountPercentage) || 0;
    const discAmt = parseFloat(formDiscountAmount) || Math.round(((rateNum * discPct) / 100) * 100) / 100;
    const netRateNum = parseFloat(formNetRate) || Math.max(0, rateNum - discAmt);

    const payload = {
      slNo: formSlNo,
      sku: formSku.trim().toUpperCase(),
      productName: formName.trim(),
      itemName: formName.trim(),
      category: formCategory.trim() || 'General',
      priceListType: currentType,
      rate: rateNum,
      discountPercentage: discPct,
      discountAmount: discAmt,
      netRate: netRateNum,
      quantity: parseFloat(formQuantity) || 10,
      unit: formUnit.trim() || 'Box',
      stock: parseFloat(formStock) || 100,
      active: true,
    };

    setSavingItem(true);
    try {
      if (editingItem && (editingItem._id || editingItem.id)) {
        const id = editingItem._id || editingItem.id;
        await PriceListsApi.update(id!, payload);
        setToast({ open: true, message: 'Price item updated successfully in ' + currentType + ' price list!', severity: 'success' });
      } else {
        await PriceListsApi.create(payload);
        setToast({ open: true, message: 'Price item added successfully to ' + currentType + ' price list!', severity: 'success' });
      }
      setItemModalOpen(false);
      fetchPriceListItems(currentType);
      fetchCategories();
    } catch (err: any) {
      setToast({ open: true, message: err.message || 'Failed to save price item', severity: 'error' });
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (item: PriceListItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.productName || item.itemName}" from ${item.priceListType === '90_PERCENT' ? '90%' : 'Custom'} Price List?`)) {
      return;
    }
    const id = item._id || item.id;
    if (!id) return;

    try {
      await PriceListsApi.delete(id);
      setToast({ open: true, message: `"${item.productName || item.itemName}" removed from this price list`, severity: 'success' });
      const currentType: PriceListType = activeTab === 'CUSTOM' ? 'CUSTOM' : '90_PERCENT';
      fetchPriceListItems(currentType);
    } catch (err: any) {
      setToast({ open: true, message: err.message || 'Failed to delete price item', severity: 'error' });
    }
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = (type: '90_PERCENT' | 'CUSTOM') => {
    if (type === '90_PERCENT') {
      const templateData = [
        {
          'S.No': 1,
          'Product Code / SKU': 'FP1001',
          'Product Name': 'Flower Pot Big',
          'Product Category': 'Flower Pots',
          'MRP Price / Rate': 100,
          '90% Discount': 90,
          'Per / PCS': 'Box',
          'Net Rate': 10,
          'Stock': 500,
        },
        {
          'S.No': 2,
          'Product Code / SKU': 'GC1002',
          'Product Name': 'Ground Chakkar Big (25 Pcs)',
          'Product Category': 'Ground Wheels',
          'MRP Price / Rate': 200,
          '90% Discount': 90,
          'Per / PCS': 'Box',
          'Net Rate': 20,
          'Stock': 400,
        },
        {
          'S.No': 3,
          'Product Code / SKU': 'SP1003',
          'Product Name': '10cm Electric Sparklers (10 Pcs)',
          'Product Category': 'Sparklers',
          'MRP Price / Rate': 80,
          '90% Discount': 90,
          'Per / PCS': 'Box',
          'Net Rate': 8,
          'Stock': 600,
        },
        {
          'S.No': 4,
          'Product Code / SKU': 'SS1004',
          'Product Name': '12 Shots Multi Color Sky Shots',
          'Product Category': 'Sky Shots',
          'MRP Price / Rate': 450,
          '90% Discount': 90,
          'Per / PCS': 'Box',
          'Net Rate': 45,
          'Stock': 200,
        },
        {
          'S.No': 5,
          'Product Code / SKU': 'GL1005',
          'Product Name': '1000 Wala Red Giant Garland',
          'Product Category': 'Garlands / Laris',
          'MRP Price / Rate': 900,
          '90% Discount': 90,
          'Per / PCS': 'Box',
          'Net Rate': 90,
          'Stock': 150,
        },
        {
          'S.No': 6,
          'Product Code / SKU': 'BR1006',
          'Product Name': 'Baby Rocket (10 Pcs)',
          'Product Category': 'Rockets',
          'MRP Price / Rate': 140,
          '90% Discount': 90,
          'Per / PCS': 'Box',
          'Net Rate': 14,
          'Stock': 250,
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 36 },
        { wch: 20 },
        { wch: 18 },
        { wch: 16 },
        { wch: 12 },
        { wch: 14 },
        { wch: 10 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '90% Price List Template');
      XLSX.writeFile(workbook, 'Crackers_90_Percent_PriceList_Template.xlsx');
    } else {
      const templateData = [
        {
          'S.No': 1,
          'Product Code / SKU': 'FP1001',
          'Product Name': 'Flower Pot Big',
          'Product Category': 'Flower Pots',
          'MRP Price / Rate': 150,
          'Discount %': 40,
          'Per / PCS': 'Box',
          'Net Rate': 90,
          'Stock': 500,
        },
        {
          'S.No': 2,
          'Product Code / SKU': 'GC1002',
          'Product Name': 'Ground Chakkar Big (25 Pcs)',
          'Product Category': 'Ground Wheels',
          'MRP Price / Rate': 250,
          'Discount %': 30,
          'Per / PCS': 'Box',
          'Net Rate': 175,
          'Stock': 400,
        },
        {
          'S.No': 3,
          'Product Code / SKU': 'SP1003',
          'Product Name': '10cm Electric Sparklers (10 Pcs)',
          'Product Category': 'Sparklers',
          'MRP Price / Rate': 100,
          'Discount %': 35,
          'Per / PCS': 'Box',
          'Net Rate': 65,
          'Stock': 600,
        },
        {
          'S.No': 4,
          'Product Code / SKU': 'SS1004',
          'Product Name': '12 Shots Multi Color Sky Shots',
          'Product Category': 'Sky Shots',
          'MRP Price / Rate': 550,
          'Discount %': 40,
          'Per / PCS': 'Box',
          'Net Rate': 330,
          'Stock': 200,
        },
        {
          'S.No': 5,
          'Product Code / SKU': 'GL1005',
          'Product Name': '1000 Wala Red Giant Garland',
          'Product Category': 'Garlands / Laris',
          'MRP Price / Rate': 1100,
          'Discount %': 30,
          'Per / PCS': 'Box',
          'Net Rate': 770,
          'Stock': 150,
        },
        {
          'S.No': 6,
          'Product Code / SKU': 'TB2001',
          'Product Name': 'Titanium Sound Bomb (10 Pcs)',
          'Product Category': 'Sound Crackers',
          'MRP Price / Rate': 300,
          'Discount %': 30,
          'Per / PCS': 'Box',
          'Net Rate': 210,
          'Stock': 180,
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 36 },
        { wch: 20 },
        { wch: 18 },
        { wch: 16 },
        { wch: 12 },
        { wch: 14 },
        { wch: 10 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Custom Price List Template');
      XLSX.writeFile(workbook, 'Crackers_Custom_PriceList_Template.xlsx');
    }
    setToast({
      open: true,
      message: `Downloaded ${type === '90_PERCENT' ? '90%' : 'Custom'} Discount Price List Excel template.`,
      severity: 'success',
    });
  };

  // Excel File Parsing with Validation & Preview (Strictly applies UI-selected priceListType)
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentType: PriceListType = activeTab === 'CUSTOM' ? 'CUSTOM' : '90_PERCENT';
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet);

        if (rawJson.length === 0) {
          setToast({ open: true, message: 'Uploaded file has no readable rows.', severity: 'error' });
          return;
        }

        const errors: string[] = [];
        const seenSkus = new Set<string>();

        const parsedRows: Partial<PriceListItem>[] = rawJson.map((row, idx) => {
          const name = String(
            row['Product Name'] ||
            row['productName'] ||
            row['Item Name'] ||
            row['itemName'] ||
            row['Product'] ||
            row['Particulars'] ||
            row['Description'] ||
            ''
          ).trim();

          const slNo = Number(row['S.No'] || row['Sl No'] || row['Sl.No'] || idx + 1);
          const sku = String(
            row['Product Code / SKU'] ||
            row['Product Code'] ||
            row['Product code'] ||
            row['SKU'] ||
            row['sku'] ||
            row['Code'] ||
            row['Item Code'] ||
            `CK-${String(slNo).padStart(3, '0')}`
          ).trim().toUpperCase();

          if (!name) {
            errors.push(`Row ${idx + 2}: Missing Product Name.`);
          }
          if (seenSkus.has(sku)) {
            errors.push(`Row ${idx + 2}: Duplicate SKU "${sku}" in this import file.`);
          } else {
            seenSkus.add(sku);
          }

          const rate = Number(
            row['MRP Price / Rate'] ||
            row['MRP Price'] ||
            row['MRP Rate'] ||
            row['MRP'] ||
            row['Rate'] ||
            row['Product Rate'] ||
            row['rate'] ||
            row['Price'] ||
            row['mrp'] ||
            0
          );

          if (isNaN(rate) || rate < 0) {
            errors.push(`Row ${idx + 2}: Invalid rate for "${name || sku}".`);
          }

          const defaultDisc = currentType === '90_PERCENT' ? 90 : 30;
          const discPct = currentType === '90_PERCENT'
            ? 90
            : Number(
                row['90% Discount'] ||
                row['Discount %'] ||
                row['Discount Percentage'] ||
                row['Discount'] ||
                row['discountPercentage'] ||
                row['discountPercent'] ||
                defaultDisc
              );

          const discAmt = Math.round(((rate * discPct) / 100) * 100) / 100;
          const rawNet = Number(
            row['Net Rate'] ||
            row['Net Price'] ||
            row['Selling Price'] ||
            row['Selling Rate'] ||
            row['Final Selling Price'] ||
            row['netRate'] ||
            0
          );
          const netRate = rawNet > 0 ? rawNet : Math.max(0, Math.round((rate - discAmt) * 100) / 100);

          const quantity = Number(
            row['Quantity / Count'] ||
            row['Quantity'] ||
            row['Qty'] ||
            row['quantity'] ||
            row['Count'] ||
            10
          );
          const category = String(
            row['Product Category'] ||
            row['Category'] ||
            row['category'] ||
            row['Group'] ||
            'General'
          ).trim();
          const unit = String(
            row['Per / PCS'] ||
            row['Per/PCS'] ||
            row['Unit'] ||
            row['unit'] ||
            row['Per'] ||
            row['PCS'] ||
            'Box'
          ).trim();
          const stock = Number(row['Stock'] || row['Physical Stock'] || row['stock'] || 100);

          return {
            slNo,
            sku,
            productName: name,
            itemName: name,
            category: category || 'General',
            priceListType: currentType,
            rate,
            discountPercentage: discPct,
            discountAmount: discAmt,
            netRate,
            quantity: !isNaN(quantity) && quantity > 0 ? quantity : 10,
            unit: unit || 'Box',
            stock: !isNaN(stock) ? stock : 100,
            active: true,
          };
        }).filter((item) => Boolean(item.productName));

        setPreviewItems(parsedRows);
        setUploadFileName(file.name);
        setUploadBatchName(file.name.replace(/\.[^/.]+$/, ''));
        setUploadErrors(errors);
        setUploadModalOpen(true);
      } catch (err: any) {
        setToast({ open: true, message: `Failed to parse Excel file: ${err.message}`, severity: 'error' });
      }
    };

    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    if (previewItems.length === 0) return;
    const currentType: PriceListType = activeTab === 'CUSTOM' ? 'CUSTOM' : '90_PERCENT';

    setUploading(true);
    try {
      await PriceListsApi.import({
        priceListType: currentType,
        items: previewItems,
        batchName: uploadBatchName,
        replaceExisting,
      });

      setToast({
        open: true,
        message: `Successfully imported ${previewItems.length} products to ${currentType === '90_PERCENT' ? '90%' : 'Custom'} Price List!`,
        severity: 'success',
      });
      setUploadModalOpen(false);
      fetchPriceListItems(currentType);
      fetchCategories();
    } catch (err: any) {
      setToast({ open: true, message: err.message || 'Import failed', severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const currentType: PriceListType = activeTab === 'CUSTOM' ? 'CUSTOM' : '90_PERCENT';
    const dataToExport = filteredItems.map((item, idx) => ({
      'S.No': idx + 1,
      'Product Code / SKU': item.sku,
      'Product Name': item.productName || item.itemName,
      'Product Category': item.category,
      'MRP Price / Rate': item.rate,
      ...(currentType === '90_PERCENT'
        ? { '90% Discount': 90 }
        : { 'Discount %': item.discountPercentage }),
      'Per / PCS': item.unit,
      'Net Rate': item.netRate,
      'Stock': item.stock ?? 100,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 36 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
    ];
    const workbook = XLSX.utils.book_new();
    const sheetName = currentType === '90_PERCENT' ? '90% Price List' : 'Custom Price List';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(
      workbook,
      `Crackers_${currentType === '90_PERCENT' ? '90Percent' : 'Custom'}_PriceList_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  // Custom Discount Tier Handlers
  const handleOpenAddDiscount = () => {
    setEditingDiscount(null);
    setDiscountPercentageInput('');
    setDiscountLabelInput('');
    setDiscountModalOpen(true);
  };

  const handleOpenEditDiscount = (item: CustomDiscountItem) => {
    setEditingDiscount(item);
    setDiscountPercentageInput(item.percentage.toString());
    setDiscountLabelInput(item.label || '');
    setDiscountModalOpen(true);
  };

  const handleSaveDiscount = async () => {
    const pct = parseFloat(discountPercentageInput);
    if (isNaN(pct) || pct < 0 || pct >= 100) {
      setToast({ open: true, message: 'Please enter a valid discount percentage (0 to 99).', severity: 'error' });
      return;
    }

    setSavingDiscount(true);
    try {
      if (editingDiscount && (editingDiscount._id || editingDiscount.id)) {
        const id = editingDiscount._id || editingDiscount.id;
        await CustomDiscountsApi.update(id!, {
          percentage: pct,
          label: discountLabelInput.trim() || `${pct}% Discount`,
        });
        setToast({ open: true, message: 'Discount tier updated successfully!', severity: 'success' });
      } else {
        await CustomDiscountsApi.create({
          percentage: pct,
          label: discountLabelInput.trim() || `${pct}% Discount`,
          isActive: true,
        });
        setToast({ open: true, message: `Added ${pct}% discount tier successfully!`, severity: 'success' });
      }
      setDiscountModalOpen(false);
      fetchCustomDiscounts();
    } catch (err: any) {
      setToast({ open: true, message: err.message || 'Failed to save discount tier', severity: 'error' });
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleToggleDiscountActive = async (discount: CustomDiscountItem) => {
    const id = discount._id || discount.id;
    if (!id) return;
    try {
      await CustomDiscountsApi.update(id, { isActive: !discount.isActive });
      fetchCustomDiscounts();
    } catch (err: any) {
      setToast({ open: true, message: err.message || 'Failed to toggle discount status', severity: 'error' });
    }
  };

  const handleDeleteDiscount = async (discount: CustomDiscountItem) => {
    if (!window.confirm(`Are you sure you want to delete ${discount.percentage}% discount tier?`)) {
      return;
    }
    const id = discount._id || discount.id;
    if (!id) return;
    try {
      await CustomDiscountsApi.delete(id);
      setToast({ open: true, message: `${discount.percentage}% discount tier removed`, severity: 'success' });
      fetchCustomDiscounts();
    } catch (err: any) {
      setToast({ open: true, message: err.message || 'Failed to delete discount tier', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, margin: '0 auto' }}>
      {/* Hidden Excel File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
      />

      {/* Top Header Card */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: '16px',
          border: '1.5px solid #FDE68A',
          background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)',
          boxShadow: '0 4px 20px rgba(217, 119, 6, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#991B1B', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PercentRoundedIcon sx={{ fontSize: 28, color: '#DC2626' }} />
              Separate Price Lists Management
            </Typography>
            <Typography variant="body2" sx={{ color: '#78350F', mt: 0.5, fontWeight: 500 }}>
              Independent MongoDB Price Lists: 90% Discount Price List and Custom Discount Price List. Zero cross-over.
            </Typography>
          </Box>

          {/* Navigation Sub-Tabs */}
          <Box
            sx={{
              display: 'flex',
              p: 0.6,
              borderRadius: '12px',
              backgroundColor: '#FEF3C7',
              border: '1.5px solid #FDE68A',
              gap: 1,
            }}
          >
            <Button
              onClick={() => setActiveTab('90_PERCENT')}
              sx={{
                px: 2.5,
                py: 1,
                borderRadius: '9px',
                fontWeight: 800,
                fontSize: '13px',
                textTransform: 'none',
                backgroundColor: activeTab === '90_PERCENT' ? '#DC2626' : 'transparent',
                color: activeTab === '90_PERCENT' ? '#FFFFFF' : '#92400E',
                boxShadow: activeTab === '90_PERCENT' ? '0 4px 12px rgba(220, 38, 38, 0.35)' : 'none',
                '&:hover': {
                  backgroundColor: activeTab === '90_PERCENT' ? '#B91C1C' : 'rgba(251, 191, 36, 0.2)',
                },
              }}
            >
              🔥 90% Price List
            </Button>

            <Button
              onClick={() => setActiveTab('CUSTOM')}
              sx={{
                px: 2.5,
                py: 1,
                borderRadius: '9px',
                fontWeight: 800,
                fontSize: '13px',
                textTransform: 'none',
                backgroundColor: activeTab === 'CUSTOM' ? '#2563EB' : 'transparent',
                color: activeTab === 'CUSTOM' ? '#FFFFFF' : '#92400E',
                boxShadow: activeTab === 'CUSTOM' ? '0 4px 12px rgba(37, 99, 235, 0.35)' : 'none',
                '&:hover': {
                  backgroundColor: activeTab === 'CUSTOM' ? '#1D4ED8' : 'rgba(251, 191, 36, 0.2)',
                },
              }}
            >
              🏷️ Custom Price List
            </Button>

            <Button
              onClick={() => setActiveTab('DISCOUNTS')}
              sx={{
                px: 2.5,
                py: 1,
                borderRadius: '9px',
                fontWeight: 800,
                fontSize: '13px',
                textTransform: 'none',
                backgroundColor: activeTab === 'DISCOUNTS' ? '#059669' : 'transparent',
                color: activeTab === 'DISCOUNTS' ? '#FFFFFF' : '#92400E',
                boxShadow: activeTab === 'DISCOUNTS' ? '0 4px 12px rgba(5, 150, 105, 0.35)' : 'none',
                '&:hover': {
                  backgroundColor: activeTab === 'DISCOUNTS' ? '#047857' : 'rgba(251, 191, 36, 0.2)',
                },
              }}
            >
              ⚙️ Discount Tiers
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* VIEW 1 & 2: 90% or Custom Price List Table View */}
      {(activeTab === '90_PERCENT' || activeTab === 'CUSTOM') && (
        <>
          {/* Controls bar */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: '14px',
              border: '1.5px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: '1 1 300px' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  px: 1.5,
                  py: 0.6,
                  width: '100%',
                  maxWidth: '380px',
                }}
              >
                <SearchRoundedIcon sx={{ color: '#64748B', mr: 1, fontSize: 20 }} />
                <InputBase
                  placeholder={`Search in ${activeTab === '90_PERCENT' ? '90%' : 'Custom'} Price List...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ width: '100%', fontSize: '13.5px', fontWeight: 600 }}
                />
                {searchTerm && (
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <ClearRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </Box>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  sx={{ borderRadius: '10px', fontSize: '13px', fontWeight: 600, backgroundColor: '#F8FAFC' }}
                >
                  <MenuItem value="ALL">All Categories</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.name} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<DownloadRoundedIcon />}
                onClick={() => handleDownloadTemplate(activeTab as '90_PERCENT' | 'CUSTOM')}
                sx={{
                  borderRadius: '10px',
                  borderColor: '#6366F1',
                  color: '#4F46E5',
                  fontWeight: 700,
                  fontSize: '13px',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#4338CA',
                    backgroundColor: '#EEF2FF',
                  },
                }}
              >
                Template ({activeTab === '90_PERCENT' ? '90%' : 'Custom'})
              </Button>

              <Button
                variant="outlined"
                startIcon={<CloudUploadRoundedIcon />}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  borderRadius: '10px',
                  borderColor: '#F59E0B',
                  color: '#B45309',
                  fontWeight: 700,
                  fontSize: '13px',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#D97706',
                    backgroundColor: '#FEF3C7',
                  },
                }}
              >
                Upload to {activeTab === '90_PERCENT' ? '90%' : 'Custom'} List
              </Button>

              <Button
                variant="outlined"
                startIcon={<DownloadRoundedIcon />}
                onClick={handleExportExcel}
                sx={{
                  borderRadius: '10px',
                  borderColor: '#059669',
                  color: '#059669',
                  fontWeight: 700,
                  fontSize: '13px',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#047857',
                    backgroundColor: '#ECFDF5',
                  },
                }}
              >
                Export Excel
              </Button>

              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={handleOpenAddModal}
                sx={{
                  borderRadius: '10px',
                  backgroundColor: activeTab === '90_PERCENT' ? '#DC2626' : '#2563EB',
                  fontWeight: 700,
                  fontSize: '13px',
                  textTransform: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  '&:hover': {
                    backgroundColor: activeTab === '90_PERCENT' ? '#B91C1C' : '#1D4ED8',
                  },
                }}
              >
                Add Product
              </Button>
            </Box>
          </Paper>

          {/* Mode Info Badge */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>
              Showing {filteredItems.length} Products in{' '}
              <span style={{ color: activeTab === '90_PERCENT' ? '#DC2626' : '#2563EB', fontWeight: 800 }}>
                {activeTab === '90_PERCENT' ? 'PRICE LIST 1 — 90% DISCOUNT PRICE LIST' : 'PRICE LIST 2 — CUSTOM DISCOUNT PRICE LIST'}
              </span>
            </Typography>
            <Chip
              label={activeTab === '90_PERCENT' ? 'priceListType = "90_PERCENT"' : 'priceListType = "CUSTOM"'}
              sx={{
                fontWeight: 800,
                fontSize: '12px',
                fontFamily: 'monospace',
                backgroundColor: activeTab === '90_PERCENT' ? '#FEE2E2' : '#DBEAFE',
                color: activeTab === '90_PERCENT' ? '#991B1B' : '#1E40AF',
                border: `1px solid ${activeTab === '90_PERCENT' ? '#FCA5A5' : '#93C5FD'}`,
              }}
            />
          </Box>

          {/* Price List Table */}
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: '14px',
              border: '1.5px solid #E2E8F0',
              overflow: 'hidden',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: activeTab === '90_PERCENT' ? '#FEF2F2' : '#EFF6FF',
                    borderBottom: '2px solid #E2E8F0',
                  }}
                >
                  <TableCell sx={{ fontWeight: 800, color: '#1E293B', py: 1.5, width: '50px' }}>S.No</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#1E293B', py: 1.5, width: '90px' }}>SKU</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Product Name</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Category</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Rate (₹)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Discount %</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Discount Amount</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#1E293B', py: 1.5, backgroundColor: activeTab === '90_PERCENT' ? '#FEE2E2' : '#DBEAFE' }}>
                    Net Rate (₹)
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Qty / Count</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Per / PCS</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, color: '#1E293B', py: 1.5, width: '90px' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={36} sx={{ color: activeTab === '90_PERCENT' ? '#DC2626' : '#2563EB' }} />
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                      <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#64748B' }}>
                        No products found in this price list.
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddRoundedIcon />}
                        onClick={handleOpenAddModal}
                        sx={{ mt: 1.5, borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                      >
                        Add First Product
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item, index) => {
                    const rate = Number(item.rate) || 0;
                    const discPct = Number(item.discountPercentage) || (activeTab === '90_PERCENT' ? 90 : 0);
                    const discAmt = Number(item.discountAmount) || Math.round(((rate * discPct) / 100) * 100) / 100;
                    const netRate = Number(item.netRate) || Math.max(0, rate - discAmt);

                    return (
                      <TableRow
                        key={item._id || item.id || index}
                        hover
                        sx={{
                          '&:hover': {
                            backgroundColor: activeTab === '90_PERCENT' ? '#FFF5F5' : '#F0F7FF',
                          },
                          borderBottom: '1px solid #F1F5F9',
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700, color: '#64748B' }}>{index + 1}</TableCell>
                        <TableCell>
                          <Chip
                            label={item.sku}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: '11px',
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                              borderRadius: '6px',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0F172A', fontSize: '13.5px' }}>
                          {item.productName || item.itemName}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.category || 'General'}
                            size="small"
                            sx={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              borderRadius: '6px',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>
                          ₹{rate.toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${discPct}%`}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: '12px',
                              backgroundColor: activeTab === '90_PERCENT' ? '#DC2626' : '#2563EB',
                              color: '#FFFFFF',
                              borderRadius: '6px',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#DC2626' }}>
                          -₹{discAmt.toFixed(2)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 800,
                            fontSize: '14px',
                            color: activeTab === '90_PERCENT' ? '#991B1B' : '#1E40AF',
                            backgroundColor: activeTab === '90_PERCENT' ? '#FEF2F2' : '#EFF6FF',
                          }}
                        >
                          ₹{netRate.toFixed(2)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: '#334155' }}>
                          {item.quantity ?? 10}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, color: '#64748B' }}>
                          {item.unit || 'Box'}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Edit Product">
                            <IconButton size="small" onClick={() => handleOpenEditModal(item)} sx={{ color: '#0284C7' }}>
                              <ModeEditOutlineRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDeleteItem(item)} sx={{ color: '#DC2626' }}>
                              <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* VIEW 3: Configurable Custom Discount Tiers */}
      {activeTab === 'DISCOUNTS' && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: '14px',
            border: '1.5px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsSuggestRoundedIcon sx={{ color: '#059669' }} />
                Custom Discount Options Configuration
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.3 }}>
                Configure available discount percentages for Custom Discount Mode.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={handleOpenAddDiscount}
              sx={{
                borderRadius: '10px',
                backgroundColor: '#059669',
                fontWeight: 700,
                fontSize: '13px',
                textTransform: 'none',
                '&:hover': { backgroundColor: '#047857' },
              }}
            >
              Add Discount Tier
            </Button>
          </Box>

          <Grid container spacing={2.5}>
            {customDiscounts.map((discount) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={discount._id || discount.id || discount.percentage}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: '12px',
                    border: '1.5px solid',
                    borderColor: discount.isActive ? '#A7F3D0' : '#E2E8F0',
                    backgroundColor: discount.isActive ? '#F0FDF4' : '#F8FAFC',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography sx={{ fontSize: '28px', fontWeight: 900, color: discount.isActive ? '#065F46' : '#64748B' }}>
                      {discount.percentage}%
                    </Typography>
                    <Switch
                      checked={discount.isActive}
                      onChange={() => handleToggleDiscountActive(discount)}
                      color="success"
                      size="small"
                    />
                  </Box>

                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#334155', mt: 1 }}>
                    {discount.label || `${discount.percentage}% Discount Tier`}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 1.5, borderTop: '1px solid #E2E8F0' }}>
                    <Chip
                      label={discount.isActive ? 'Active' : 'Disabled'}
                      size="small"
                      sx={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: discount.isActive ? '#DCFCE7' : '#F1F5F9',
                        color: discount.isActive ? '#166534' : '#64748B',
                      }}
                    />
                    <Box>
                      <IconButton size="small" onClick={() => handleOpenEditDiscount(discount)} sx={{ color: '#0284C7' }}>
                        <ModeEditOutlineRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteDiscount(discount)} sx={{ color: '#DC2626' }}>
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Manual Add / Edit Item Dialog */}
      <Dialog open={itemModalOpen} onClose={() => setItemModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: activeTab === '90_PERCENT' ? '#991B1B' : '#1E40AF', borderBottom: '1px solid #E2E8F0' }}>
          {editingItem ? 'Edit Product' : `Add Product to ${activeTab === '90_PERCENT' ? '90%' : 'Custom'} Price List`}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="SKU / Code"
                fullWidth
                required
                size="small"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                placeholder="e.g. FP1001"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                label="Product Name"
                fullWidth
                required
                size="small"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Flower Pot Big"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Category"
                fullWidth
                size="small"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="e.g. Flower Pots"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Quantity / Count"
                type="number"
                fullWidth
                size="small"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Per / Unit"
                fullWidth
                size="small"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                placeholder="e.g. Box, Pcs, Pkt"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Rate (₹)"
                type="number"
                fullWidth
                size="small"
                value={formRate}
                onChange={(e) => handleRateChange(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Discount %"
                type="number"
                fullWidth
                size="small"
                disabled={activeTab === '90_PERCENT'}
                value={activeTab === '90_PERCENT' ? '90' : formDiscountPercentage}
                onChange={(e) => handleDiscountPercentageChange(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Net Rate (₹)"
                type="number"
                fullWidth
                size="small"
                value={formNetRate}
                onChange={(e) => setFormNetRate(e.target.value)}
                sx={{ backgroundColor: '#FEF3C7', borderRadius: '4px' }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setItemModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveItem}
            disabled={savingItem}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: activeTab === '90_PERCENT' ? '#DC2626' : '#2563EB',
            }}
          >
            {savingItem ? 'Saving...' : 'Save Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Excel Upload Preview Modal */}
      <Dialog open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#991B1B' }}>
          Import Preview: {uploadFileName} ({previewItems.length} Products)
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 1.5 }}>
            Target Price List:{' '}
            <strong style={{ color: activeTab === '90_PERCENT' ? '#DC2626' : '#2563EB' }}>
              {activeTab === '90_PERCENT' ? 'PRICE LIST 1 — 90% DISCOUNT PRICE LIST' : 'PRICE LIST 2 — CUSTOM DISCOUNT PRICE LIST'}
            </strong>
          </Typography>

          <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', p: 1.2, backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
              Download Sample Templates:
            </Typography>
            <Button
              size="small"
              variant="text"
              startIcon={<DownloadRoundedIcon />}
              onClick={() => handleDownloadTemplate('90_PERCENT')}
              sx={{ textTransform: 'none', fontWeight: 700, color: '#DC2626', fontSize: '11.5px', py: 0 }}
            >
              90% Template (.xlsx)
            </Button>
            <Button
              size="small"
              variant="text"
              startIcon={<DownloadRoundedIcon />}
              onClick={() => handleDownloadTemplate('CUSTOM')}
              sx={{ textTransform: 'none', fontWeight: 700, color: '#2563EB', fontSize: '11.5px', py: 0 }}
            >
              Custom Template (.xlsx)
            </Button>
          </Box>

          {uploadErrors.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2, maxHeight: 120, overflowY: 'auto' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '12px' }}>
                Found {uploadErrors.length} validation notes:
              </Typography>
              {uploadErrors.slice(0, 5).map((err, i) => (
                <div key={i} style={{ fontSize: '11.5px' }}>• {err}</div>
              ))}
            </Alert>
          )}

          <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 300, border: '1px solid #CBD5E1' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Product Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Rate</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Disc %</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Disc Amt</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Net Rate</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Qty</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Unit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewItems.slice(0, 30).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ fontWeight: 600 }}>{row.sku}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{row.productName}</TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell align="right">₹{row.rate?.toFixed(2)}</TableCell>
                    <TableCell align="center">{row.discountPercentage}%</TableCell>
                    <TableCell align="right">₹{row.discountAmount?.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#991B1B' }}>
                      ₹{row.netRate?.toFixed(2)}
                    </TableCell>
                    <TableCell align="center">{row.quantity}</TableCell>
                    <TableCell align="center">{row.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  color="error"
                />
              }
              label={`Replace all existing records in ${activeTab === '90_PERCENT' ? '90%' : 'Custom'} Price List with this upload`}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setUploadModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmImport}
            disabled={uploading || previewItems.length === 0}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: '#059669',
              '&:hover': { backgroundColor: '#047857' },
            }}
          >
            {uploading ? 'Importing...' : `Confirm Import (${previewItems.length} items)`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Discount Tier Add/Edit Modal */}
      <Dialog open={discountModalOpen} onClose={() => setDiscountModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#065F46' }}>
          {editingDiscount ? 'Edit Discount Tier' : 'Add Custom Discount Tier'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Discount Percentage (%)"
            type="number"
            fullWidth
            required
            size="small"
            value={discountPercentageInput}
            onChange={(e) => setDiscountPercentageInput(e.target.value)}
            placeholder="e.g. 35"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Label (Optional)"
            fullWidth
            size="small"
            value={discountLabelInput}
            onChange={(e) => setDiscountLabelInput(e.target.value)}
            placeholder="e.g. 35% Festive Special"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDiscountModalOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveDiscount}
            disabled={savingDiscount}
            sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#059669' }}
          >
            {savingDiscount ? 'Saving...' : 'Save Tier'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notification */}
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

export default PriceListPage;

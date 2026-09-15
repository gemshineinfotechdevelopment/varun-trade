import { useState, useEffect, useMemo, type FC } from 'react';
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
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ModeEditOutlineRoundedIcon from '@mui/icons-material/ModeEditOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import { ProductsApi, CategoriesApi, PriceListsApi } from '../services/api';
import { printProductsListDirectly } from '../utils/printUtils';

export interface ProductItem {
  _id?: string;
  id?: string;
  slNo: number;
  name: string;
  category?: string;
  rate?: number;
  mrp?: number;
  unit?: string;
}

export const ProductsPage: FC = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<{ name: string; color?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Add / Edit Modal State
  const [openModal, setOpenModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('General');
  const [productUnit, setProductUnit] = useState('Box');
  const [productRate, setProductRate] = useState<string>('0');
  const [productMrp, setProductMrp] = useState<string>('0');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchProductsAndPrices = async () => {
    try {
      setLoading(true);
      const [prodsData, catsData, priceData] = await Promise.all([
        ProductsApi.getAll().catch(() => []),
        CategoriesApi.getAll().catch(() => []),
        PriceListsApi.getAll().catch(() => []),
      ]);

      const priceMap = new Map<string, any>();
      if (Array.isArray(priceData)) {
        priceData.forEach((item: any) => {
          if (item.itemName) {
            priceMap.set(item.itemName.toLowerCase().trim(), item);
          }
        });
      }

      // Merge product list with price list data so latest amounts are always reflected
      let mergedProducts: ProductItem[] = [];
      const seenNames = new Set<string>();

      if (Array.isArray(prodsData)) {
        prodsData.forEach((p: any, idx: number) => {
          const key = (p.name || '').toLowerCase().trim();
          seenNames.add(key);
          const priceItem = priceMap.get(key);
          mergedProducts.push({
            _id: p._id || p.id,
            id: p._id || p.id,
            slNo: p.slNo || idx + 1,
            name: p.name,
            category: priceItem?.category || p.category || 'General',
            rate: priceItem?.rate !== undefined ? priceItem.rate : (p.rate || 0),
            mrp: priceItem?.mrp !== undefined ? priceItem.mrp : (p.mrp || 0),
            unit: priceItem?.unit || p.unit || 'Box',
          });
        });
      }

      // If price list has items that aren't yet in products, include them too
      if (Array.isArray(priceData)) {
        let maxSlNo = mergedProducts.length > 0 ? Math.max(...mergedProducts.map((p) => p.slNo || 0)) : 0;
        priceData.forEach((pItem: any) => {
          const key = (pItem.itemName || '').toLowerCase().trim();
          if (key && !seenNames.has(key)) {
            maxSlNo += 1;
            seenNames.add(key);
            mergedProducts.push({
              _id: pItem._id || pItem.id,
              id: pItem._id || pItem.id,
              slNo: pItem.slNo || maxSlNo,
              name: pItem.itemName,
              category: pItem.category || 'General',
              rate: pItem.rate || 0,
              mrp: pItem.mrp || 0,
              unit: pItem.unit || 'Box',
            });
          }
        });
      }

      setProducts(mergedProducts);
      if (Array.isArray(catsData) && catsData.length > 0) {
        setCategories(catsData.map((c) => ({ name: c.name, color: c.color })));
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndPrices();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        String(p.slNo).includes(term) ||
        String(p.rate).includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setProductName('');
    setProductCategory(categories[0]?.name || 'General');
    setProductUnit('Box');
    setProductRate('0');
    setProductMrp('0');
    setOpenModal(true);
  };

  const handleOpenEdit = (product: ProductItem) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductCategory(product.category || 'General');
    setProductUnit(product.unit || 'Box');
    setProductRate(String(product.rate || 0));
    setProductMrp(String(product.mrp || 0));
    setOpenModal(true);
  };

  const handleSaveProduct = async () => {
    if (!productName.trim()) {
      alert('Please enter product name');
      return;
    }

    try {
      setModalLoading(true);
      const payload = {
        name: productName.trim(),
        category: productCategory,
        unit: productUnit,
        rate: Number(productRate) || 0,
        mrp: Number(productMrp) || 0,
      };

      if (editingProduct) {
        const id = editingProduct._id || editingProduct.id || '';
        await ProductsApi.update(id, payload);
      } else {
        const nextSlNo = products.length > 0 ? Math.max(...products.map((p) => p.slNo || 0)) + 1 : 1;
        await ProductsApi.create({
          slNo: nextSlNo,
          ...payload,
        });
      }
      setOpenModal(false);
      fetchProductsAndPrices();
    } catch (err) {
      console.error('Failed to save product:', err);
      alert('Error saving product');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteProduct = async (product: ProductItem) => {
    const id = product._id || product.id || '';
    if (!id) return;
    if (!window.confirm(`Delete product "${product.name}"?`)) return;

    try {
      await ProductsApi.delete(id);
      setProducts((prev) => prev.filter((p) => (p._id || p.id) !== id));
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Error deleting product');
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        px: { xs: 1, sm: 1.5, md: 2 },
        py: 1,
        boxSizing: 'border-box',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1.5px solid #FDE68A',
          boxShadow: '0 4px 20px -2px rgba(217, 119, 6, 0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Festive Crimson & Gold Header Banner */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
            borderBottom: '2px solid #F59E0B',
            px: { xs: 2, sm: 3 },
            py: 1.5,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
            minHeight: '60px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Inventory2RoundedIcon sx={{ color: '#FEF08A', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  color: '#FFFFFF',
                  fontSize: '18px',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                }}
              >
                Products & Price Catalog
              </Typography>
              <Typography sx={{ color: '#FEF08A', fontSize: '11.5px', fontWeight: 600 }}>
                Synced directly with Price List & Categories
              </Typography>
            </Box>
            <Typography
              sx={{
                color: '#FEF08A',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: 'rgba(254, 240, 138, 0.2)',
                border: '1px solid rgba(254, 240, 138, 0.35)',
                px: 1.2,
                py: 0.3,
                borderRadius: '12px',
                ml: 1,
              }}
            >
              {filteredProducts.length} items
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
            }}
          >
            {/* Search Box */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                px: 1.2,
                height: '38px',
                width: { xs: '100%', sm: '220px' },
                boxSizing: 'border-box',
                border: '1.5px solid #FDE68A',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <SearchRoundedIcon sx={{ color: '#D97706', fontSize: 19, mr: 0.8, flexShrink: 0 }} />
              <InputBase
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1F1714',
                  width: '100%',
                  '& input': {
                    p: 0,
                    '&::placeholder': { color: '#A8998A', opacity: 1 },
                  },
                }}
              />
              {searchTerm && (
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm('')}
                  sx={{ p: 0.4, color: '#D97706', '&:hover': { color: '#B45309' } }}
                >
                  <ClearRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>

            {/* Print Products List Button */}
            <Button
              variant="contained"
              disableElevation
              onClick={() => printProductsListDirectly(filteredProducts)}
              startIcon={<PrintOutlinedIcon sx={{ fontSize: 18 }} />}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                color: '#FFFFFF',
                border: '1px solid rgba(254, 240, 138, 0.4)',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'none',
                px: 1.8,
                height: '38px',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              Print List
            </Button>

            {/* Add Product Button */}
            <Button
              variant="contained"
              disableElevation
              onClick={handleOpenAdd}
              startIcon={<AddRoundedIcon sx={{ fontSize: 18 }} />}
              sx={{
                backgroundColor: '#FFFFFF',
                color: '#B91C1C',
                border: '1.5px solid #FDE68A',
                fontSize: '13px',
                fontWeight: 800,
                textTransform: 'none',
                px: 2,
                height: '38px',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: '#FFFBEB',
                },
              }}
            >
              Add Product
            </Button>
          </Box>
        </Box>

        {/* Category Pills Filter */}
        <Box
          sx={{
            p: 1.2,
            px: { xs: 2, sm: 3 },
            backgroundColor: '#FFFDF7',
            borderBottom: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#92400E', mr: 0.5, flexShrink: 0 }}>
            Category:
          </Typography>

          <Chip
            label={`All (${products.length})`}
            onClick={() => setSelectedCategory('ALL')}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              backgroundColor: selectedCategory === 'ALL' ? '#B91C1C' : '#FFFFFF',
              color: selectedCategory === 'ALL' ? '#FFFFFF' : '#78350F',
              border: selectedCategory === 'ALL' ? '1px solid #991B1B' : '1px solid #FDE68A',
              '&:hover': {
                backgroundColor: selectedCategory === 'ALL' ? '#991B1B' : '#FEF3C7',
              },
            }}
          />

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            const count = products.filter((p) => p.category === cat.name).length;
            return (
              <Chip
                key={cat.name}
                label={`${cat.name} (${count})`}
                onClick={() => setSelectedCategory(cat.name)}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#B91C1C' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#57463A',
                  border: isSelected ? '1px solid #991B1B' : '1px solid #E5E7EB',
                  '&:hover': {
                    backgroundColor: isSelected ? '#991B1B' : '#F3F4F6',
                  },
                }}
              />
            );
          })}
        </Box>

        {/* Table Container */}
        <TableContainer sx={{ height: 'calc(100vh - 185px)', maxHeight: 'calc(100vh - 185px)' }}>
          <Table stickyHeader sx={{ width: '100%' }} aria-label="product table">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#FFFBEB' }}>
                <TableCell
                  sx={{
                    py: 1.5,
                    px: { xs: 2, sm: 3 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#7C2D12',
                    letterSpacing: '0.04em',
                    backgroundColor: '#FFFBEB',
                    borderBottom: '2px solid #FDE68A',
                    width: '80px',
                  }}
                >
                  SL.NO
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.5,
                    px: { xs: 2, sm: 3 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#7C2D12',
                    letterSpacing: '0.04em',
                    backgroundColor: '#FFFBEB',
                    borderBottom: '2px solid #FDE68A',
                  }}
                >
                  PRODUCT NAME
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.5,
                    px: { xs: 1.5, sm: 2.5 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#7C2D12',
                    letterSpacing: '0.04em',
                    backgroundColor: '#FFFBEB',
                    borderBottom: '2px solid #FDE68A',
                    width: '200px',
                  }}
                >
                  CATEGORY
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    py: 1.5,
                    px: { xs: 1, sm: 2 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#7C2D12',
                    letterSpacing: '0.04em',
                    backgroundColor: '#FFFBEB',
                    borderBottom: '2px solid #FDE68A',
                    width: '90px',
                  }}
                >
                  UNIT
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    py: 1.5,
                    px: { xs: 1.5, sm: 2.5 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#7C2D12',
                    letterSpacing: '0.04em',
                    backgroundColor: '#FFFBEB',
                    borderBottom: '2px solid #FDE68A',
                    width: '120px',
                  }}
                >
                  MRP (₹)
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    py: 1.5,
                    px: { xs: 2, sm: 3 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#7C2D12',
                    letterSpacing: '0.04em',
                    backgroundColor: '#FFFBEB',
                    borderBottom: '2px solid #FDE68A',
                    width: '140px',
                  }}
                >
                  RATE / PRICE (₹)
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    py: 1.5,
                    px: { xs: 1.5, sm: 2.5 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#7C2D12',
                    letterSpacing: '0.04em',
                    backgroundColor: '#FFFBEB',
                    borderBottom: '2px solid #FDE68A',
                    width: '80px',
                  }}
                >
                  EDIT
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    py: 1.5,
                    px: { xs: 2, sm: 3 },
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#7C2D12',
                    letterSpacing: '0.04em',
                    backgroundColor: '#FFFBEB',
                    borderBottom: '2px solid #FDE68A',
                    width: '80px',
                  }}
                >
                  DELETE
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#DC2626' }} />
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#786C58' }}>
                    {searchTerm ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '14px', color: '#786C58', fontWeight: 500 }}>
                          No products matching "{searchTerm}" found.
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => setSearchTerm('')}
                          sx={{ textTransform: 'none', color: '#B91C1C', fontWeight: 700 }}
                        >
                          Clear Search
                        </Button>
                      </Box>
                    ) : (
                      'No products found. Upload a price list or click "Add Product" to add one.'
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product, index) => {
                  const isLast = index === filteredProducts.length - 1;
                  return (
                    <TableRow
                      key={product._id || product.id || index}
                      sx={{
                        '&:hover': {
                          backgroundColor: '#FEFDF5',
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          py: 1.4,
                          px: { xs: 2, sm: 3 },
                          fontSize: '13.5px',
                          fontWeight: 700,
                          color: '#786C58',
                          borderBottom: isLast ? 'none' : '1px solid #F7EEDB',
                        }}
                      >
                        {product.slNo || index + 1}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 1.4,
                          px: { xs: 2, sm: 3 },
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#1F1714',
                          letterSpacing: '0.01em',
                          borderBottom: isLast ? 'none' : '1px solid #F7EEDB',
                        }}
                      >
                        {product.name}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 1.4,
                          px: { xs: 1.5, sm: 2.5 },
                          borderBottom: isLast ? 'none' : '1px solid #F7EEDB',
                        }}
                      >
                        <Chip
                          label={product.category || 'General'}
                          size="small"
                          sx={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            backgroundColor: '#FFFBEB',
                            color: '#92400E',
                            border: '1px solid #FDE68A',
                            borderRadius: '6px',
                            height: '24px',
                          }}
                        />
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          py: 1.4,
                          px: { xs: 1, sm: 2 },
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#57463A',
                          borderBottom: isLast ? 'none' : '1px solid #F7EEDB',
                        }}
                      >
                        {product.unit || 'Box'}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          py: 1.4,
                          px: { xs: 1.5, sm: 2.5 },
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: '#6B7280',
                          borderBottom: isLast ? 'none' : '1px solid #F7EEDB',
                        }}
                      >
                        {product.mrp ? `₹${Number(product.mrp).toLocaleString('en-IN')}` : '—'}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          py: 1.4,
                          px: { xs: 2, sm: 3 },
                          fontSize: '14.5px',
                          fontWeight: 800,
                          color: '#B91C1C',
                          borderBottom: isLast ? 'none' : '1px solid #F7EEDB',
                        }}
                      >
                        ₹{Number(product.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>

                      {/* Edit Button */}
                      <TableCell
                        align="center"
                        sx={{
                          py: 1.4,
                          px: { xs: 1.5, sm: 2.5 },
                          borderBottom: isLast ? 'none' : '1px solid #F7EEDB',
                        }}
                      >
                        <Tooltip title="Edit Product" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(product)}
                            sx={{
                              color: '#D97706',
                              backgroundColor: '#FFFBEB',
                              border: '1px solid #FDE68A',
                              borderRadius: '6px',
                              p: 0.6,
                              transition: 'all 0.15s ease',
                              '&:hover': {
                                color: '#FFFFFF',
                                backgroundColor: '#D97706',
                                borderColor: '#D97706',
                              },
                            }}
                          >
                            <ModeEditOutlineRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>

                      {/* Delete Button */}
                      <TableCell
                        align="center"
                        sx={{
                          py: 1.4,
                          px: { xs: 2, sm: 3 },
                          borderBottom: isLast ? 'none' : '1px solid #F7EEDB',
                        }}
                      >
                        <Tooltip title="Delete Product" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteProduct(product)}
                            sx={{
                              color: '#DC2626',
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FECACA',
                              borderRadius: '6px',
                              p: 0.6,
                              transition: 'all 0.15s ease',
                              '&:hover': {
                                color: '#FFFFFF',
                                backgroundColor: '#DC2626',
                                borderColor: '#DC2626',
                              },
                            }}
                          >
                            <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
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
      </Paper>

      {/* Add / Edit Product Modal */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              p: 1,
              border: '1.5px solid #FDE68A',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: '18px', fontWeight: 800, color: '#B91C1C' }}>
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '10px !important' }}>
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
              Product Name *
            </Typography>
            <TextField
              autoFocus
              fullWidth
              size="small"
              placeholder="e.g. 2 1/2 KURUVI"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
            />
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                Category
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  sx={{ fontSize: '13.5px', fontWeight: 600 }}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.name} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                  {categories.every((c) => c.name !== productCategory) && (
                    <MenuItem value={productCategory}>{productCategory}</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                Unit
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Box, Pcs, Pkt"
                value={productUnit}
                onChange={(e) => setProductUnit(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                MRP (₹)
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={productMrp}
                onChange={(e) => setProductMrp(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#B91C1C', mb: 0.6 }}>
                Selling Rate / Price (₹) *
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={productRate}
                onChange={(e) => setProductRate(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '14px', fontWeight: 800, color: '#B91C1C' } } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setOpenModal(false)}
            sx={{ color: '#786C58', fontWeight: 600, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleSaveProduct}
            disabled={modalLoading}
            sx={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
              borderRadius: '8px',
              '&:hover': { background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' },
            }}
          >
            {modalLoading ? 'Saving...' : 'Save Product'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

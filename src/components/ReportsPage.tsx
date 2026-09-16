import { useState, useEffect, useMemo, type FC } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import * as XLSX from 'xlsx';
import { ParticularsApi, type SalesSummaryData } from '../services/api';
import { BillPrintModal } from './BillPrintModal';
import type { BillPrintData } from './BillPrintTemplate';

export const ReportsPage: FC = () => {
  const [bills, setBills] = useState<any[]>([]);
  const [summary, setSummary] = useState<SalesSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [pricingModeFilter, setPricingModeFilter] = useState<string>('ALL');
  const [customDiscountFilter, setCustomDiscountFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // Print modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<BillPrintData | null>(null);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const [billsData, summaryData] = await Promise.all([
        ParticularsApi.getAll({
          pricingMode: pricingModeFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        ParticularsApi.getSalesSummary(),
      ]);

      setBills(billsData || []);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load reports data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [pricingModeFilter, startDate, endDate]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchCustomer =
        !customerSearch.trim() ||
        (b.customerName && b.customerName.toLowerCase().includes(customerSearch.toLowerCase().trim())) ||
        (b.billNo && b.billNo.toLowerCase().includes(customerSearch.toLowerCase().trim()));

      const matchCustomDisc =
        customDiscountFilter === 'ALL' ||
        (b.pricingMode === 'CUSTOM' && String(b.customDiscountPercent || 30) === customDiscountFilter);

      return matchCustomer && matchCustomDisc;
    });
  }, [bills, customerSearch, customDiscountFilter]);

  const handleOpenPrint = (bill: any) => {
    const printData: BillPrintData = {
      billNo: bill.billNo,
      date: bill.date,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      customerAddress: bill.customerAddress,
      customerGst: bill.customerGst,
      companyName: bill.companyName,
      caseCount: bill.caseCount,
      pricingMode: bill.pricingMode,
      customDiscountPercent: bill.customDiscountPercent,
      products: (bill.products || []).map((p: any) => ({
        particular: p.particular,
        quantity: p.quantity,
        rate: p.netRate || p.rate,
        pktUnit: p.pktUnit,
        amount: p.amount,
      })),
      amount: bill.amount,
      discount: bill.discount,
      transport: bill.transport,
      packing: bill.packing,
      tax: bill.tax,
      total: bill.total,
      paymentStatus: bill.paymentStatus,
      paymentMode: bill.paymentMode,
      paidAmount: bill.paidAmount,
    };
    setSelectedBillForPrint(printData);
    setPrintModalOpen(true);
  };

  const handleExportSalesExcel = () => {
    const data = filteredBills.map((b, idx) => ({
      'S.No': idx + 1,
      'Bill No': b.billNo,
      'Date': b.date,
      'Customer Name': b.customerName,
      'Pricing Mode': b.pricingMode === 'CUSTOM' ? `Custom (${b.customDiscountPercent || 30}%)` : '90% Discount',
      'Total Cases': b.caseCount || (b.products || []).reduce((acc: number, p: any) => acc + (parseFloat(p.quantity) || 0), 0),
      'Items Count': (b.products || []).length,
      'Net Total (₹)': parseFloat(b.total || b.amount || 0),
      'Payment Status': b.paymentStatus || 'PAID',
      'Payment Mode': b.paymentMode || 'CASH',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
    XLSX.writeFile(wb, `Crackers_Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: '16px',
          border: '1.5px solid #FDE68A',
          background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#991B1B', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AssessmentRoundedIcon sx={{ fontSize: 32, color: '#DC2626' }} />
              Crackers Sales & Pricing Mode Reports
            </Typography>
            <Typography variant="body2" sx={{ color: '#78350F', mt: 0.5, fontWeight: 500 }}>
              Complete sales analytics, breakdowns between 90% Discount Bills and Custom Discount Bills, and customer order history.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<DownloadRoundedIcon />}
            onClick={handleExportSalesExcel}
            sx={{
              borderRadius: '10px',
              backgroundColor: '#059669',
              fontWeight: 800,
              textTransform: 'none',
              '&:hover': { backgroundColor: '#047857' },
            }}
          >
            Export Sales Excel
          </Button>
        </Box>
      </Paper>

      {/* KPI Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Total Overall Sales */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '14px',
              border: '1.5px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total Gross Sales
            </Typography>
            <Typography sx={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', mt: 0.5 }}>
              ₹{(summary?.totalSales || 0).toLocaleString('en-IN')}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#059669', fontWeight: 700, mt: 0.5 }}>
              {summary?.totalBills || 0} Total Completed Bills
            </Typography>
          </Paper>
        </Grid>

        {/* 90% Mode Sales */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '14px',
              border: '1.5px solid #FCA5A5',
              backgroundColor: '#FFF1F2',
            }}
          >
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>
              🔥 90% Mode Sales
            </Typography>
            <Typography sx={{ fontSize: '26px', fontWeight: 900, color: '#DC2626', mt: 0.5 }}>
              ₹{(summary?.ninetyMode.totalSales || 0).toLocaleString('en-IN')}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#991B1B', fontWeight: 700, mt: 0.5 }}>
              {summary?.ninetyMode.billsCount || 0} Bills Generated
            </Typography>
          </Paper>
        </Grid>

        {/* Custom Mode Sales */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '14px',
              border: '1.5px solid #93C5FD',
              backgroundColor: '#EFF6FF',
            }}
          >
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>
              🏷️ Custom Mode Sales
            </Typography>
            <Typography sx={{ fontSize: '26px', fontWeight: 900, color: '#2563EB', mt: 0.5 }}>
              ₹{(summary?.customMode.totalSales || 0).toLocaleString('en-IN')}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#1E40AF', fontWeight: 700, mt: 0.5 }}>
              {summary?.customMode.billsCount || 0} Bills Generated
            </Typography>
          </Paper>
        </Grid>

        {/* Total Crackers Discount Given */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '14px',
              border: '1.5px solid #FEF08A',
              backgroundColor: '#FEFCE8',
            }}
          >
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#854D0E', textTransform: 'uppercase' }}>
              Total Discount Savings Given
            </Typography>
            <Typography sx={{ fontSize: '26px', fontWeight: 900, color: '#CA8A04', mt: 0.5 }}>
              ₹{(summary?.totalDiscountGiven || 0).toLocaleString('en-IN')}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#854D0E', fontWeight: 700, mt: 0.5 }}>
              Direct Customer Savings
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: '14px',
          border: '1.5px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <FormControl size="small" fullWidth>
              <InputLabel id="pricing-mode-filter-label">Pricing Mode</InputLabel>
              <Select
                labelId="pricing-mode-filter-label"
                label="Pricing Mode"
                value={pricingModeFilter}
                onChange={(e) => setPricingModeFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Pricing Modes</MenuItem>
                <MenuItem value="90_PERCENT">90% Discount Mode</MenuItem>
                <MenuItem value="CUSTOM">Custom Discount Mode</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {pricingModeFilter === 'CUSTOM' && (
            <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
              <FormControl size="small" fullWidth>
                <InputLabel id="custom-disc-filter-label">Discount Tier</InputLabel>
                <Select
                  labelId="custom-disc-filter-label"
                  label="Discount Tier"
                  value={customDiscountFilter}
                  onChange={(e) => setCustomDiscountFilter(e.target.value)}
                >
                  <MenuItem value="ALL">All Discount Tiers</MenuItem>
                  <MenuItem value="30">30% Discount</MenuItem>
                  <MenuItem value="40">40% Discount</MenuItem>
                  <MenuItem value="50">50% Discount</MenuItem>
                  <MenuItem value="60">60% Discount</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <TextField
              label="Search Customer / Bill #"
              size="small"
              fullWidth
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="e.g. Saravana or 1001"
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField
              label="From Date"
              type="date"
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField
              label="To Date"
              type="date"
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Sales Bills Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: '14px',
          border: '1.5px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Bill No</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Customer Name</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Pricing Mode</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Cases</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Grand Total (₹)</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Payment Mode</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#1E293B', py: 1.5 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={36} />
                </TableCell>
              </TableRow>
            ) : filteredBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ fontWeight: 700, color: '#64748B' }}>No sales bills match the filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredBills.map((b) => {
                const isCustom = b.pricingMode === 'CUSTOM';
                return (
                  <TableRow key={b._id || b.id} hover sx={{ borderBottom: '1px solid #F1F5F9' }}>
                    <TableCell sx={{ fontWeight: 800, color: '#0F172A' }}>#{b.billNo}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748B' }}>{b.date}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>{b.customerName}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={isCustom ? `Custom (${b.customDiscountPercent || 30}%)` : '90% Discount'}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: '11px',
                          backgroundColor: isCustom ? '#DBEAFE' : '#FEE2E2',
                          color: isCustom ? '#1E40AF' : '#991B1B',
                          border: `1px solid ${isCustom ? '#93C5FD' : '#FCA5A5'}`,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>
                      {b.caseCount || (b.products || []).reduce((acc: number, p: any) => acc + (parseFloat(p.quantity) || 0), 0)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, fontSize: '14px', color: '#0F172A' }}>
                      ₹{parseFloat(b.total || b.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={b.paymentMode || 'CASH'} size="small" sx={{ fontWeight: 700, fontSize: '11px' }} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={b.paymentStatus || 'PAID'}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: '11px',
                          backgroundColor: b.paymentStatus === 'PAID' ? '#DCFCE7' : '#FEF3C7',
                          color: b.paymentStatus === 'PAID' ? '#166534' : '#92400E',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View & Print Invoice">
                        <IconButton size="small" onClick={() => handleOpenPrint(b)} sx={{ color: '#DC2626' }}>
                          <PrintOutlinedIcon sx={{ fontSize: 18 }} />
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

      {/* Bill Print Modal */}
      {printModalOpen && selectedBillForPrint && (
        <BillPrintModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          bill={selectedBillForPrint}
        />
      )}
    </Box>
  );
};

export default ReportsPage;

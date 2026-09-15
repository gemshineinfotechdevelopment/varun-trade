import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { BillPrintTemplate, type BillPrintData } from './BillPrintTemplate';
import { printBillDirectly } from '../utils/printUtils';

interface BillPrintModalProps {
  open: boolean;
  onClose: () => void;
  bill: BillPrintData | null;
}

export const BillPrintModal: React.FC<BillPrintModalProps> = ({ open, onClose, bill }) => {
  if (!bill) return null;

  const handleTriggerPrint = () => {
    printBillDirectly(bill);
  };

  return (
    <>
      {/* Hidden print styling that guarantees ONLY the bill template is printed */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            .dheeksha-printable-section,
            .dheeksha-printable-section * {
              visibility: visible !important;
            }
            .dheeksha-printable-section {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #FFFFFF !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .dheeksha-no-print {
              display: none !important;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
        `}
      </style>

      {/* Screen Dialog for Previewing */}
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '14px',
            overflow: 'hidden',
            backgroundColor: '#FEFDF9',
            border: '1px solid #FDE68A',
            boxShadow: '0 20px 40px -15px rgba(217, 119, 6, 0.25)',
          },
        }}
      >
        {/* Modal Top Bar */}
        <Box
          className="dheeksha-no-print"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 1.8,
            background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
            borderBottom: '2px solid #F59E0B',
            color: '#FFFFFF',
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.01em' }}>
              Bill Preview - #{bill.billNo || 'New'}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#FEF3C7', fontWeight: 500 }}>
              {bill.customerName} | {bill.companyName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              disableElevation
              onClick={handleTriggerPrint}
              startIcon={<PrintOutlinedIcon sx={{ fontSize: '18px !important', color: '#7C2D12' }} />}
              sx={{
                backgroundColor: '#FEF3C7',
                color: '#7C2D12',
                border: '1px solid #FDE68A',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'none',
                px: 2,
                py: 0.6,
                borderRadius: '6px',
                '&:hover': {
                  backgroundColor: '#FDE68A',
                },
              }}
            >
              Print Invoice
            </Button>
            <IconButton onClick={onClose} sx={{ color: '#FFFFFF', p: 0.8 }}>
              <CloseRoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Modal Body with Bill Document */}
        <DialogContent
          sx={{
            p: { xs: 1.5, sm: 3 },
            backgroundColor: '#FFFDF7',
            display: 'flex',
            justifyContent: 'center',
            overflowY: 'auto',
          }}
        >
          <Box
            className="dheeksha-printable-section"
            sx={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
              borderRadius: '0px',
              border: 'none',
              width: '100%',
              maxWidth: '820px',
            }}
          >
            <BillPrintTemplate bill={bill} />
          </Box>
        </DialogContent>

        {/* Modal Bottom Actions */}
        <DialogActions
          className="dheeksha-no-print"
          sx={{
            px: 3,
            py: 1.5,
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #FEF3C7',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Button
            onClick={onClose}
            sx={{
              color: '#78350F',
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { backgroundColor: '#FFFBEB' },
            }}
          >
            Close
          </Button>

          <Button
            variant="contained"
            disableElevation
            onClick={handleTriggerPrint}
            startIcon={<PrintOutlinedIcon sx={{ fontSize: '18px !important' }} />}
            sx={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
              py: 0.8,
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
              },
            }}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

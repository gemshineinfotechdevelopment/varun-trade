import React from 'react';
import { getStoredSettings } from './SettingsPage';

export interface BillPrintProduct {
  productId?: string;
  sku?: string;
  particular: string;
  quantity: string | number;
  rate: string | number; // MRP or selling rate
  discountPercentage?: string | number;
  discountAmount?: string | number;
  netRate?: string | number;
  pktUnit: string | number;
  amount: string | number;
}

export interface BillPrintData {
  billNo: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGst?: string;
  companyName: string;
  pricingMode?: '90_PERCENT' | 'CUSTOM' | string;
  customDiscountPercent?: number;
  preparedBy?: string;
  phone?: string;
  email?: string;
  website?: string;
  transport?: string;
  caseCount?: string | number;
  products: BillPrintProduct[];
  amount?: string | number;
  discount?: string | number;
  packing?: string | number;
  tax?: string | number;
  total?: string | number;
  paymentStatus?: string;
  paymentMode?: string;
  paidAmount?: string | number;
  notes?: string;
  pdfData?: string;
  pdfUrl?: string;
  pdfName?: string;
}

interface BillPrintTemplateProps {
  bill: BillPrintData;
}

export const BillPrintTemplate: React.FC<BillPrintTemplateProps> = ({ bill }) => {
  const [storeSettings, setStoreSettings] = React.useState(() => getStoredSettings());

  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      setStoreSettings(getStoredSettings());
    };
    window.addEventListener('dheeksha_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('dheeksha_settings_updated', handleSettingsUpdate);
    };
  }, []);

  // Calculate Subtotal from Products or bill.amount
  const prodSubtotal = (bill.products || []).reduce((acc, p) => {
    const amt = parseFloat(String(p.amount).replace(/,/g, '')) || 0;
    return acc + amt;
  }, 0);
  const subtotal = prodSubtotal > 0 ? prodSubtotal : (parseFloat(String(bill.amount || bill.total || '0').replace(/,/g, '')) || 0);

  // Discount calculation
  const rawDiscStr = String(bill.discount ?? '').trim();
  const cleanDisc = rawDiscStr.replace(/[^0-9.]/g, '');
  const discNum = parseFloat(cleanDisc) || 0;
  let discountAmt = 0;
  let discountLabel = 'Discount';
  if (discNum > 0) {
    if (rawDiscStr.includes('%') || (discNum <= 100 && !rawDiscStr.startsWith('₹'))) {
      discountAmt = (subtotal * discNum) / 100;
      discountLabel = `Discount (${discNum}%)`;
    } else {
      discountAmt = discNum;
      discountLabel = `Discount (₹${discNum.toFixed(2)})`;
    }
  }

  // Transport calculation
  const rawTransportStr = String(bill.transport ?? '').trim();
  const cleanTrans = rawTransportStr.replace(/[^0-9.]/g, '');
  const transNum = parseFloat(cleanTrans) || 0;
  const transportAmt = (!isNaN(Number(rawTransportStr)) && transNum > 0) ? transNum : 0;
  const transportDisplayName = (!rawTransportStr || rawTransportStr === '0' || rawTransportStr === '-') ? '-' : rawTransportStr;

  // Packing calculation
  const rawPackStr = String(bill.packing ?? '').trim();
  const cleanPack = rawPackStr.replace(/[^0-9.]/g, '');
  const packNum = parseFloat(cleanPack) || 0;
  let packingAmt = 0;
  let packingLabel = 'Packing Charges';
  if (packNum > 0) {
    if (rawPackStr.includes('%')) {
      packingAmt = (subtotal * packNum) / 100;
      packingLabel = `Packing Charges (${packNum}%)`;
    } else {
      packingAmt = packNum;
      packingLabel = `Packing Charges`;
    }
  }

  // Tax calculation
  const rawTaxStr = String(bill.tax ?? '').trim();
  const cleanTax = rawTaxStr.replace(/[^0-9.]/g, '');
  const taxNum = parseFloat(cleanTax) || 0;
  let taxAmt = 0;
  let taxLabel = 'GST / Tax';
  if (taxNum > 0) {
    const baseForTax = Math.max(0, subtotal - discountAmt + transportAmt + packingAmt);
    taxAmt = (baseForTax * taxNum) / 100;
    taxLabel = `GST / Tax (${taxNum}%)`;
  }

  // Final Net Total
  const calculatedTotal = Math.max(0, subtotal - discountAmt + transportAmt + packingAmt + taxAmt);
  const rawTotalNum = parseFloat(String(bill.total ?? bill.amount ?? '0').replace(/,/g, '')) || 0;
  const finalTotalNum = rawTotalNum > 0 ? rawTotalNum : calculatedTotal;
  const formattedTotal = '₹' + finalTotalNum.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Calculate sum of quantities across products for Total No. of Cases
  const computedCases = bill.caseCount !== undefined && bill.caseCount !== ''
    ? bill.caseCount
    : (bill.products || []).reduce((acc, p) => acc + (parseFloat(String(p.quantity)) || 0), 0);

  const displayCompanyName =
    bill.companyName &&
    bill.companyName !== 'Dheeksha Trade' &&
    bill.companyName !== 'Dheeksha Trade Link' &&
    bill.companyName.trim() !== ''
      ? bill.companyName
      : storeSettings.companyName || 'Balaji Crackers & Fireworks';

  const isTaxActive = Boolean(storeSettings.enableTax) || (parseFloat(String(bill.tax || '0').replace(/[^0-9.]/g, '')) > 0);
  const cityLine = `${storeSettings.city || 'Sivakasi'}${storeSettings.state ? `, ${storeSettings.state}` : ', Tamil Nadu'}`;
  const gstinLine = (isTaxActive && storeSettings.gstin) ? `GSTIN: ${storeSettings.gstin}` : '';
  const phoneLine = storeSettings.phone ? `Mobile: ${storeSettings.phone}` : '';
  const metaContact = [gstinLine, phoneLine].filter(Boolean).join(' | ');

  const receiptSrc = bill.pdfData || bill.pdfUrl || '';

  const isCustomMode = bill.pricingMode === 'CUSTOM';
  const pricingModeText = isCustomMode
    ? `CUSTOM DISCOUNT PRICE LIST${bill.customDiscountPercent ? ` (${bill.customDiscountPercent}%)` : ''}`
    : '90% DISCOUNT PRICE LIST';

  return (
    <div
      className="dheeksha-bill-container"
      style={{
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto',
        backgroundColor: '#FFFFFF',
        color: '#000000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        border: '1.5px solid #000000',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          textAlign: 'center',
          padding: '12px 16px 10px 16px',
          borderBottom: '1.5px solid #000000',
        }}
      >
        {storeSettings.logoUrl && (
          <div style={{ marginBottom: '4px' }}>
            <img
              src={storeSettings.logoUrl}
              alt="Logo"
              style={{ maxHeight: '48px', maxWidth: '150px', objectFit: 'contain' }}
            />
          </div>
        )}
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#000000',
            margin: '0 0 2px 0',
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
          }}
        >
          {displayCompanyName}
        </h1>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
          {cityLine}
        </div>
        {metaContact && (
          <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', marginTop: '2px' }}>
            {metaContact}
          </div>
        )}
      </div>

      {/* Bill Metadata Block */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          borderBottom: '1.5px solid #000000',
          fontSize: '12px',
        }}
      >
        <tbody>
          <tr>
            <td style={{ width: '50%', border: '1px solid #000000', padding: '5px 10px' }}>
              <span style={{ color: '#475569', fontWeight: 500, marginRight: '4px' }}>Bill No:</span>
              <strong style={{ color: '#000000' }}>#{bill.billNo || '-'}</strong>
            </td>
            <td style={{ width: '50%', border: '1px solid #000000', padding: '5px 10px' }}>
              <span style={{ color: '#475569', fontWeight: 500, marginRight: '4px' }}>Date:</span>
              <strong style={{ color: '#000000' }}>{bill.date || '-'}</strong>
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000000', padding: '5px 10px' }}>
              <span style={{ color: '#475569', fontWeight: 500, marginRight: '4px' }}>Customer Name:</span>
              <strong style={{ color: '#000000' }}>{bill.customerName || '-'}</strong>
              {bill.customerPhone && (
                <span style={{ color: '#475569', marginLeft: '6px' }}>({bill.customerPhone})</span>
              )}
            </td>
            <td style={{ border: '1px solid #000000', padding: '5px 10px' }}>
              <span style={{ color: '#475569', fontWeight: 500, marginRight: '4px' }}>Pricing List:</span>
              <strong style={{ color: isCustomMode ? '#1E40AF' : '#B91C1C', textTransform: 'uppercase' }}>
                {pricingModeText}
              </strong>
            </td>
          </tr>
          {bill.customerAddress && (
            <tr>
              <td colSpan={2} style={{ border: '1px solid #000000', padding: '5px 10px' }}>
                <span style={{ color: '#475569', fontWeight: 500, marginRight: '4px' }}>Address:</span>
                <span>{bill.customerAddress}</span>
              </td>
            </tr>
          )}
          <tr>
            <td style={{ border: '1px solid #000000', padding: '5px 10px' }}>
              <span style={{ color: '#475569', fontWeight: 500, marginRight: '4px' }}>Transport:</span>
              <strong>{transportDisplayName}</strong>
            </td>
            <td style={{ border: '1px solid #000000', padding: '5px 10px' }}>
              <span style={{ color: '#475569', fontWeight: 500, marginRight: '4px' }}>Total Cases:</span>
              <strong>{computedCases}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Products Table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          borderBottom: '1.5px solid #000000',
          fontSize: '11.5px',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC' }}>
            <th style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'center', width: '40px', fontWeight: 700 }}>
              S.No
            </th>
            <th style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'left', fontWeight: 700 }}>
              Particulars / Cracker Item
            </th>
            <th style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'center', width: '60px', fontWeight: 700 }}>
              Qty
            </th>
            <th style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'center', width: '60px', fontWeight: 700 }}>
              Per
            </th>
            <th style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'right', width: '75px', fontWeight: 700 }}>
              Rate (₹)
            </th>
            <th style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'right', width: '85px', fontWeight: 700 }}>
              Amount (₹)
            </th>
          </tr>
        </thead>
        <tbody>
          {(bill.products || []).length === 0 ? (
            <tr>
              <td colSpan={6} style={{ border: '1px solid #000000', textAlign: 'center', padding: '14px', color: '#64748B' }}>
                No product items in bill
              </td>
            </tr>
          ) : (
            (bill.products || []).map((item, idx) => {
              const numAmt = parseFloat(String(item.amount).replace(/,/g, '')) || 0;
              const numRate = parseFloat(String(item.rate).replace(/,/g, '')) || 0;
              return (
                <tr key={idx}>
                  <td style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #000000', padding: '5px 6px', fontWeight: 600 }}>
                    {item.sku ? `[${item.sku}] ` : ''}{item.particular || '-'}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'center' }}>{item.quantity || '-'}</td>
                  <td style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'center' }}>
                    {item.pktUnit && item.pktUnit !== '-' ? item.pktUnit : 'Box'}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'right' }}>
                    {numRate > 0 ? numRate.toFixed(2) : (item.rate || '-')}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'right', fontWeight: 700 }}>
                    {numAmt.toFixed(2)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Bottom Summary Section */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
        }}
      >
        {/* Left Column: Signatory Box */}
        <div
          style={{
            flex: '1 1 50%',
            borderRight: '1.5px solid #000000',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            minHeight: '130px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
              Payment Mode: <strong>{bill.paymentMode || 'CASH'}</strong> | Status: <strong>{bill.paymentStatus || 'PAID'}</strong>
            </div>
            {bill.notes && (
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                Note: {bill.notes}
              </div>
            )}
            {receiptSrc && (
              <div style={{ marginTop: '8px' }}>
                <img
                  src={receiptSrc}
                  alt="Receipt attachment"
                  style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div style={{ borderTop: '1px dashed #000000', width: '160px', margin: '0 auto 4px auto' }}></div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
              For {displayCompanyName}
            </div>
          </div>
        </div>

        {/* Right Column: Calculations */}
        <div style={{ flex: '1 1 50%', boxSizing: 'border-box' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11.5px',
            }}
          >
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000000', padding: '5px 8px', fontWeight: 600 }}>Sub Total:</td>
                <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
                  ₹{subtotal.toFixed(2)}
                </td>
              </tr>
              {discountAmt > 0 && (
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '5px 8px', color: '#DC2626', fontWeight: 600 }}>
                    {discountLabel}:
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right', color: '#DC2626', fontWeight: 700 }}>
                    -₹{discountAmt.toFixed(2)}
                  </td>
                </tr>
              )}
              {transportAmt > 0 && (
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '5px 8px', fontWeight: 600 }}>Transport:</td>
                  <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right' }}>
                    ₹{transportAmt.toFixed(2)}
                  </td>
                </tr>
              )}
              {packingAmt > 0 && (
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '5px 8px', fontWeight: 600 }}>{packingLabel}:</td>
                  <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right' }}>
                    ₹{packingAmt.toFixed(2)}
                  </td>
                </tr>
              )}
              {taxAmt > 0 && (
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '5px 8px', fontWeight: 600 }}>{taxLabel}:</td>
                  <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right' }}>
                    ₹{taxAmt.toFixed(2)}
                  </td>
                </tr>
              )}
              <tr style={{ backgroundColor: '#F8FAFC' }}>
                <td style={{ border: '1.5px solid #000000', padding: '6px 8px', fontWeight: 800, fontSize: '13px' }}>
                  NET TOTAL:
                </td>
                <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '14px', color: '#000000' }}>
                  {formattedTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillPrintTemplate;

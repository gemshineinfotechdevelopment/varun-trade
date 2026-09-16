import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

import { connectDB } from './config/db';
import { Customer } from './models/Customer';
import { Company } from './models/Company';
import { Product } from './models/Product';
import { PriceList } from './models/PriceList';
import { CustomDiscount } from './models/CustomDiscount';
import { Particular } from './models/Particular';
import { AccountLedger } from './models/AccountLedger';
import { seedDefaultAdmin } from './controllers/authController';

const seedSampleData = async () => {
  try {
    console.log('🌱 Connecting to database...');
    await connectDB();

    console.log('👤 Ensuring default admin exists...');
    await seedDefaultAdmin();

    console.log('🧹 Clearing existing collections...');
    await Customer.deleteMany({});
    await Company.deleteMany({});
    await Product.deleteMany({});
    await PriceList.deleteMany({});
    await CustomDiscount.deleteMany({});
    await Particular.deleteMany({});
    await AccountLedger.deleteMany({});

    console.log('🎯 Seeding Custom Discount tiers...');
    await CustomDiscount.insertMany([
      { percentage: 10, label: '10% Discount', displayOrder: 1, isActive: true },
      { percentage: 20, label: '20% Discount', displayOrder: 2, isActive: true },
      { percentage: 30, label: '30% Discount', displayOrder: 3, isActive: true },
      { percentage: 40, label: '40% Discount', displayOrder: 4, isActive: true },
      { percentage: 50, label: '50% Discount', displayOrder: 5, isActive: true },
      { percentage: 60, label: '60% Discount', displayOrder: 6, isActive: true },
    ]);

    console.log('📦 Seeding Master Physical Inventory (Common Stock)...');
    await Product.insertMany([
      { slNo: 1, sku: 'FP1001', name: 'Flower Pot Big', category: 'Flower Pots', unit: 'Box', stock: 500 },
      { slNo: 2, sku: 'GC1002', name: 'Ground Chakkar Big (25 Pcs)', category: 'Ground Wheels', unit: 'Box', stock: 400 },
      { slNo: 3, sku: 'SP1003', name: '10cm Electric Sparklers (10 Pcs)', category: 'Sparklers', unit: 'Box', stock: 600 },
      { slNo: 4, sku: 'SS1004', name: '12 Shots Multi Color Sky Shots', category: 'Sky Shots', unit: 'Box', stock: 200 },
      { slNo: 5, sku: 'GL1005', name: '1000 Wala Red Giant Garland', category: 'Garlands / Laris', unit: 'Box', stock: 150 },
      { slNo: 6, sku: 'BR1006', name: 'Baby Rocket (10 Pcs) [90% Exclusive]', category: 'Rockets', unit: 'Box', stock: 250 },
      { slNo: 7, sku: 'TB2001', name: 'Titanium Sound Bomb [Custom Exclusive]', category: 'Sound Crackers', unit: 'Box', stock: 180 },
    ]);

    console.log('📋 Seeding PRICE LIST 1 — 90% DISCOUNT PRICE LIST (Separate Documents)...');
    await PriceList.insertMany([
      {
        slNo: 1,
        sku: 'FP1001',
        productName: 'Flower Pot Big',
        itemName: 'Flower Pot Big',
        category: 'Flower Pots',
        priceListType: '90_PERCENT',
        rate: 100,
        discountPercentage: 90,
        discountAmount: 90,
        netRate: 10,
        quantity: 10,
        unit: 'Box',
        stock: 500,
        active: true,
        batchName: 'Standard 90% Price List 2026',
      },
      {
        slNo: 2,
        sku: 'GC1002',
        productName: 'Ground Chakkar Big (25 Pcs)',
        itemName: 'Ground Chakkar Big (25 Pcs)',
        category: 'Ground Wheels',
        priceListType: '90_PERCENT',
        rate: 200,
        discountPercentage: 90,
        discountAmount: 180,
        netRate: 20,
        quantity: 5,
        unit: 'Box',
        stock: 400,
        active: true,
        batchName: 'Standard 90% Price List 2026',
      },
      {
        slNo: 3,
        sku: 'SP1003',
        productName: '10cm Electric Sparklers (10 Pcs)',
        itemName: '10cm Electric Sparklers (10 Pcs)',
        category: 'Sparklers',
        priceListType: '90_PERCENT',
        rate: 80,
        discountPercentage: 90,
        discountAmount: 72,
        netRate: 8,
        quantity: 10,
        unit: 'Box',
        stock: 600,
        active: true,
        batchName: 'Standard 90% Price List 2026',
      },
      {
        slNo: 4,
        sku: 'SS1004',
        productName: '12 Shots Multi Color Sky Shots',
        itemName: '12 Shots Multi Color Sky Shots',
        category: 'Sky Shots',
        priceListType: '90_PERCENT',
        rate: 450,
        discountPercentage: 90,
        discountAmount: 405,
        netRate: 45,
        quantity: 1,
        unit: 'Box',
        stock: 200,
        active: true,
        batchName: 'Standard 90% Price List 2026',
      },
      {
        slNo: 5,
        sku: 'GL1005',
        productName: '1000 Wala Red Giant Garland',
        itemName: '1000 Wala Red Giant Garland',
        category: 'Garlands / Laris',
        priceListType: '90_PERCENT',
        rate: 900,
        discountPercentage: 90,
        discountAmount: 810,
        netRate: 90,
        quantity: 1,
        unit: 'Box',
        stock: 150,
        active: true,
        batchName: 'Standard 90% Price List 2026',
      },
      {
        slNo: 6,
        sku: 'BR1006',
        productName: 'Baby Rocket (10 Pcs) [90% Exclusive]',
        itemName: 'Baby Rocket (10 Pcs) [90% Exclusive]',
        category: 'Rockets',
        priceListType: '90_PERCENT',
        rate: 140,
        discountPercentage: 90,
        discountAmount: 126,
        netRate: 14,
        quantity: 10,
        unit: 'Box',
        stock: 250,
        active: true,
        batchName: 'Standard 90% Price List 2026',
      },
    ]);

    console.log('📋 Seeding PRICE LIST 2 — CUSTOM DISCOUNT PRICE LIST (Separate Documents)...');
    await PriceList.insertMany([
      {
        slNo: 1,
        sku: 'FP1001',
        productName: 'Flower Pot Big',
        itemName: 'Flower Pot Big',
        category: 'Flower Pots',
        priceListType: 'CUSTOM',
        rate: 150,
        discountPercentage: 40,
        discountAmount: 60,
        netRate: 90,
        quantity: 10,
        unit: 'Box',
        stock: 500,
        active: true,
        batchName: 'Custom Trade Price List 2026',
      },
      {
        slNo: 2,
        sku: 'GC1002',
        productName: 'Ground Chakkar Big (25 Pcs)',
        itemName: 'Ground Chakkar Big (25 Pcs)',
        category: 'Ground Wheels',
        priceListType: 'CUSTOM',
        rate: 250,
        discountPercentage: 30,
        discountAmount: 75,
        netRate: 175,
        quantity: 5,
        unit: 'Box',
        stock: 400,
        active: true,
        batchName: 'Custom Trade Price List 2026',
      },
      {
        slNo: 3,
        sku: 'SP1003',
        productName: '10cm Electric Sparklers (10 Pcs)',
        itemName: '10cm Electric Sparklers (10 Pcs)',
        category: 'Sparklers',
        priceListType: 'CUSTOM',
        rate: 100,
        discountPercentage: 35,
        discountAmount: 35,
        netRate: 65,
        quantity: 10,
        unit: 'Box',
        stock: 600,
        active: true,
        batchName: 'Custom Trade Price List 2026',
      },
      {
        slNo: 4,
        sku: 'SS1004',
        productName: '12 Shots Multi Color Sky Shots',
        itemName: '12 Shots Multi Color Sky Shots',
        category: 'Sky Shots',
        priceListType: 'CUSTOM',
        rate: 550,
        discountPercentage: 40,
        discountAmount: 220,
        netRate: 330,
        quantity: 1,
        unit: 'Box',
        stock: 200,
        active: true,
        batchName: 'Custom Trade Price List 2026',
      },
      {
        slNo: 5,
        sku: 'GL1005',
        productName: '1000 Wala Red Giant Garland',
        itemName: '1000 Wala Red Giant Garland',
        category: 'Garlands / Laris',
        priceListType: 'CUSTOM',
        rate: 1100,
        discountPercentage: 30,
        discountAmount: 330,
        netRate: 770,
        quantity: 1,
        unit: 'Box',
        stock: 150,
        active: true,
        batchName: 'Custom Trade Price List 2026',
      },
      {
        slNo: 6,
        sku: 'TB2001',
        productName: 'Titanium Sound Bomb [Custom Exclusive]',
        itemName: 'Titanium Sound Bomb [Custom Exclusive]',
        category: 'Sound Crackers',
        priceListType: 'CUSTOM',
        rate: 300,
        discountPercentage: 30,
        discountAmount: 90,
        netRate: 210,
        quantity: 5,
        unit: 'Box',
        stock: 180,
        active: true,
        batchName: 'Custom Trade Price List 2026',
      },
    ]);

    console.log('🏢 Seeding Companies...');
    await Company.insertMany([
      {
        slNo: '01',
        name: 'Balaji Crackers & Fireworks',
        avatarLetter: 'B',
        avatarBg: '#FEE2E2',
        avatarColor: '#DC2626',
        address: '124, Sivakasi Main Road, Sivakasi, Tamil Nadu - 626123',
        gstin: '33AABCB1234F1Z5',
      },
    ]);

    console.log('👥 Seeding Customers...');
    await Customer.insertMany([
      {
        idCode: '#0001',
        name: 'Saravana Stores & Agency',
        avatarLetter: 'S',
        avatarBg: '#E0E7FF',
        avatarColor: '#3730A3',
        address: '45, Gandhi Road, Salem, Tamil Nadu',
        mobile: '+91 98765 43210',
        gst: '33AABCS1111A1Z1',
      },
      {
        idCode: '#0002',
        name: 'Murugan Traders Madurai',
        avatarLetter: 'M',
        avatarBg: '#FCE7F3',
        avatarColor: '#9D174D',
        address: '12, Cross Cut Road, Madurai, Tamil Nadu',
        mobile: '+91 98421 23456',
        gst: '33AADCM2222B1Z2',
      },
    ]);

    console.log('📄 Seeding Sample Bills...');
    // Sample Bill 1: 90% Mode
    const bill1 = await Particular.create({
      customerName: 'Saravana Stores & Agency',
      customerPhone: '+91 98765 43210',
      companyName: 'Balaji Crackers & Fireworks',
      priceListType: '90_PERCENT',
      pricingMode: '90_PERCENT',
      caseCount: '15',
      billNo: '1001',
      date: '2026-09-10',
      discount: '0',
      transport: '0',
      packing: '0',
      tax: '0',
      amount: '200.00',
      total: '200.00',
      paymentStatus: 'PAID',
      paymentMode: 'CASH',
      paidAmount: '200.00',
      products: [
        {
          sku: 'FP1001',
          productName: 'Flower Pot Big',
          particular: 'Flower Pot Big',
          category: 'Flower Pots',
          quantity: '10',
          rate: '100',
          discountPercentage: '90',
          discountAmount: '90',
          netRate: '10',
          pktUnit: 'Box',
          amount: '100.00',
          priceListType: '90_PERCENT',
        },
        {
          sku: 'GC1002',
          productName: 'Ground Chakkar Big (25 Pcs)',
          particular: 'Ground Chakkar Big (25 Pcs)',
          category: 'Ground Wheels',
          quantity: '5',
          rate: '200',
          discountPercentage: '90',
          discountAmount: '180',
          netRate: '20',
          pktUnit: 'Box',
          amount: '100.00',
          priceListType: '90_PERCENT',
        },
      ],
    });

    // Sample Bill 2: Custom Mode
    const bill2 = await Particular.create({
      customerName: 'Murugan Traders Madurai',
      customerPhone: '+91 98421 23456',
      companyName: 'Balaji Crackers & Fireworks',
      priceListType: 'CUSTOM',
      pricingMode: 'CUSTOM',
      customDiscountPercent: 40,
      caseCount: '15',
      billNo: '1002',
      date: '2026-09-12',
      discount: '0',
      transport: '0',
      packing: '0',
      tax: '0',
      amount: '1775.00',
      total: '1775.00',
      paymentStatus: 'PAID',
      paymentMode: 'UPI',
      paidAmount: '1775.00',
      products: [
        {
          sku: 'FP1001',
          productName: 'Flower Pot Big',
          particular: 'Flower Pot Big',
          category: 'Flower Pots',
          quantity: '10',
          rate: '150',
          discountPercentage: '40',
          discountAmount: '60',
          netRate: '90',
          pktUnit: 'Box',
          amount: '900.00',
          priceListType: 'CUSTOM',
        },
        {
          sku: 'GC1002',
          productName: 'Ground Chakkar Big (25 Pcs)',
          particular: 'Ground Chakkar Big (25 Pcs)',
          category: 'Ground Wheels',
          quantity: '5',
          rate: '250',
          discountPercentage: '30',
          discountAmount: '75',
          netRate: '175',
          pktUnit: 'Box',
          amount: '875.00',
          priceListType: 'CUSTOM',
        },
      ],
    });

    console.log('💰 Seeding Account Ledgers...');
    await AccountLedger.insertMany([
      {
        particularId: String(bill1._id),
        billNo: '1001',
        customerName: 'Saravana Stores & Agency',
        companyName: 'Balaji Crackers & Fireworks',
        date: '2026-09-10',
        debit: '200.00',
        credit: '0.00',
        balance: '0.00',
        type: 'BILL',
      },
      {
        particularId: String(bill1._id),
        billNo: '1001',
        customerName: 'Saravana Stores & Agency',
        companyName: 'Balaji Crackers & Fireworks',
        date: '2026-09-10',
        debit: '0.00',
        credit: '200.00',
        balance: '0.00',
        type: 'PAYMENT',
      },
      {
        particularId: String(bill2._id),
        billNo: '1002',
        customerName: 'Murugan Traders Madurai',
        companyName: 'Balaji Crackers & Fireworks',
        date: '2026-09-12',
        debit: '1775.00',
        credit: '0.00',
        balance: '0.00',
        type: 'BILL',
      },
      {
        particularId: String(bill2._id),
        billNo: '1002',
        customerName: 'Murugan Traders Madurai',
        companyName: 'Balaji Crackers & Fireworks',
        date: '2026-09-12',
        debit: '0.00',
        credit: '1775.00',
        balance: '0.00',
        type: 'PAYMENT',
      },
    ]);

    console.log('=============================================');
    console.log('✅ Two Separate Price Lists Seeded in MongoDB!');
    console.log('   - 90% Price List: 6 documents');
    console.log('   - Custom Price List: 6 documents');
    console.log('   - 7 Master physical inventory products');
    console.log('   - 2 Sample Bills in each mode');
    console.log('=============================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedSampleData();

import { Router } from 'express';
import {
  getPriceLists,
  importPriceList,
  getBillingProducts,
  createPriceListItem,
  updatePriceListItem,
  deletePriceListItem,
  clearAllPriceList,
} from '../controllers/priceListController';

const router = Router();

// Base Price List collection routes
router.route('/').get(getPriceLists).post(createPriceListItem);

// Import & Billing Search routes
router.post('/import', importPriceList);
router.post('/bulk', importPriceList); // alias
router.get('/billing/products', getBillingProducts);

// Named helper routes
router.get('/90', (req, res) => {
  req.query.type = '90_PERCENT';
  getPriceLists(req, res);
});
router.get('/custom', (req, res) => {
  req.query.type = 'CUSTOM';
  getPriceLists(req, res);
});

router.delete('/clear/all', clearAllPriceList);

// Specific item routes
router.route('/:id').put(updatePriceListItem).delete(deletePriceListItem);

export default router;

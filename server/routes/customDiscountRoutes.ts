import { Router } from 'express';
import {
  getCustomDiscounts,
  createCustomDiscount,
  updateCustomDiscount,
  deleteCustomDiscount,
} from '../controllers/customDiscountController';

const router = Router();

router.route('/').get(getCustomDiscounts).post(createCustomDiscount);
router.route('/:id').put(updateCustomDiscount).delete(deleteCustomDiscount);

export default router;

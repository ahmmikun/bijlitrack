import express from 'express';
import { 
  getDashboardSummary, 
  getBillingHistory, 
  getOutageHistory, 
  getLatestReport 
} from '../controllers/dashboard.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect); // All dashboard routes require authentication

router.get('/:referenceId', getDashboardSummary);
router.get('/:referenceId/billing', getBillingHistory);
router.get('/:referenceId/outages', getOutageHistory);
router.get('/:referenceId/report', getLatestReport);

export default router;

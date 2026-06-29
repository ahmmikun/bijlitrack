import express from 'express';
import { 
  getDashboardSummary, 
  saveSnapshot,
  getBillingHistory, 
  getOutageHistory, 
  getLatestReport 
} from '../controllers/dashboard.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect); // All dashboard routes require authentication

router.get('/:referenceId', getDashboardSummary);
router.post('/:referenceId/save', saveSnapshot); // Frontend sends CCMS data here to store
router.get('/:referenceId/billing', getBillingHistory);
router.get('/:referenceId/outages', getOutageHistory);
router.get('/:referenceId/report', getLatestReport);

export default router;

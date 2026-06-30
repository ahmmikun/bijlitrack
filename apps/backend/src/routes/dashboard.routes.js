import express from 'express';
import { 
  getDashboardSummary, 
  saveSnapshot,
  getBillingHistory, 
  getOutageHistory, 
  getLatestReport,
  generateReport
} from '../controllers/dashboard.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect); // All dashboard routes require authentication

router.get('/:referenceId', getDashboardSummary);
router.post('/:referenceId/save', saveSnapshot);
router.get('/:referenceId/billing', getBillingHistory);
router.get('/:referenceId/outages', getOutageHistory);
router.get('/:referenceId/report', getLatestReport);
router.post('/:referenceId/report/generate', generateReport);

export default router;

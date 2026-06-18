import express from 'express';
import { trackByReference, trackByTicket } from '../controllers/complaint.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/track-by-reference', trackByReference);
router.get('/track-by-ticket', trackByTicket);

export default router;

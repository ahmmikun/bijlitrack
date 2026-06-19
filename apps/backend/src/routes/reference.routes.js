import express from 'express';
import { trackReference, getMyReferences, deleteReference } from '../controllers/reference.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect); // All reference routes require auth

router.post('/track', trackReference);
router.get('/my', getMyReferences);
router.delete('/:id', deleteReference);

export default router;

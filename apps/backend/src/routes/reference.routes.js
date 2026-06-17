import express from 'express';
import { lookupReference, trackReference, getMyReferences, deleteReference, syncReference } from '../controllers/reference.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// One-time lookup doesn't technically require login, 
// but requirements say "Only logged-in users can track".
// Let's keep lookup public but tracking protected.
router.post('/lookup', lookupReference);

router.post('/track', protect, trackReference);
router.get('/my', protect, getMyReferences);
router.post('/:id/sync', protect, syncReference);
router.delete('/:id', protect, deleteReference);

export default router;

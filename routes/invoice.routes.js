import express from 'express';
import { getInvoices, createInvoice, updateInvoice, deleteInvoice } from '../controllers/invoice.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('invoices.view'), getInvoices)
    .post(authorize('invoices.create'), createInvoice);

router.route('/:id')
    .put(authorize('invoices.edit', 'invoices.changeStatus'), updateInvoice) // Permite editar o cambiar estado
    .delete(authorize('invoices.delete'), deleteInvoice);

export default router;
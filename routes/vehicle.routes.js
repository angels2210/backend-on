import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import {
    getVehicles, createVehicle, updateVehicle, deleteVehicle,
    assignInvoicesToVehicle, unassignInvoiceFromVehicle,
    dispatchVehicle, finalizeTrip
} from '../controllers/vehicle.controller.js';

const router = express.Router();
router.use(protect); // Todas las rutas de vehículos están protegidas

router.route('/')
    .get(authorize('flota.view'), getVehicles)
    .post(authorize('flota.create'), createVehicle);

router.route('/:id')
    .put(authorize('flota.edit'), updateVehicle)
    .delete(authorize('flota.delete'), deleteVehicle);

// Rutas de operaciones
router.post('/:id/assign-invoices', authorize('flota.edit'), assignInvoicesToVehicle);
router.post('/:id/unassign-invoice', authorize('flota.edit'), unassignInvoiceFromVehicle);
router.post('/:id/dispatch', authorize('flota.dispatch'), dispatchVehicle);
router.post('/:id/finalize-trip', authorize('flota.dispatch'), finalizeTrip);

export default router;
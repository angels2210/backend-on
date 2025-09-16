import express from 'express';
import { getCompanyInfo, updateCompanyInfo } from '../controllers/companyInfo.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// 1. Ruta PÚBLICA para obtener la información de la empresa.
// Cualquiera puede acceder a esta ruta para cargar la pantalla de login.
router.get('/', getCompanyInfo);

// 2. Ruta PROTEGIDA para actualizar la información.
// Solo usuarios autenticados y con el permiso correcto pueden acceder.
router.put('/', protect, authorize('config.company.edit'), updateCompanyInfo);

export default router;
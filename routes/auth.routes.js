import express from 'express';
import { login, getMe } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Ruta pública para iniciar sesión
router.post('/login', login);

// Ruta protegida para obtener los datos del usuario a partir de su token
// Es útil para verificar si una sesión sigue activa en el frontend.
router.get('/profile', protect, getMe);

export default router;
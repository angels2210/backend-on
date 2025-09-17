import express from 'express';
import { login, getMe, refreshToken } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Ruta pública para iniciar sesión
router.post('/login', login);

// Ruta pública para refrescar el token
router.post('/refresh', refreshToken);

// Ruta protegida para obtener los datos del usuario a partir de su token
router.get('/profile', protect, getMe);

// ✅ ESTA LÍNEA ES LA SOLUCIÓN
export default router;
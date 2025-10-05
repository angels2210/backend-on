import express from 'express';
import { login, refreshToken, logout, getMe } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout); // <-- Esta es la ruta que faltaba

router.get('/profile', protect, getMe);

export default router;
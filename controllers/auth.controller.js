import jwt from 'jsonwebtoken';
import { User, Role } from '../models/index.js';
import bcrypt from 'bcryptjs';

// @desc    Autenticar un usuario y obtener tokens
// @route   POST /api/auth/login
export const login = async (req, res) => {
    const { username, password } = req.body;

    console.log(`\n--- [DEBUG] Intento de login para usuario: ${username} ---`);
    console.log(`--- [DEBUG] Contraseña recibida: ${password} ---`);

    try {
        if (!username || !password) {
            return res.status(400).json({ message: 'Por favor, proporcione un usuario y contraseña.' });
        }

        const user = await User.findOne({ 
            where: { username },
            include: { model: Role } 
        });

        if (user) {
            console.log(`--- [DEBUG] Hash almacenado en BD: ${user.password} ---`);

            const isMatch = await bcrypt.compare(password, user.password);

            console.log(`--- [DEBUG] Resultado de la comparación de contraseñas: ${isMatch} ---`);

            if (isMatch) {
                console.log('--- [DEBUG] ¡Coincidencia exitosa! Generando tokens... ---');
                const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
                    expiresIn: '15m',
                });
                const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
                    expiresIn: '1h',
                });

                const { password: _, ...userWithoutPassword } = user.toJSON();

                return res.json({
                    accessToken,
                    refreshToken,
                    user: userWithoutPassword,
                });
            }
        }

        // Si el usuario no existe o la contraseña no coincide
        console.log('--- [DEBUG] Fallo: Usuario no encontrado o la contraseña no coincide. ---');
        return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });

    } catch (error) {
        console.error('--- [DEBUG] Error catastrófico en el login:', error);
        return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// @desc    Refrescar el token de acceso usando un refresh token
// @route   POST /api/auth/refresh
export const refreshToken = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(401).json({ message: 'No se proporcionó un refresh token.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado.' });
        }

        const newAccessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: '15m',
        });

        res.json({ accessToken: newAccessToken });

    } catch (error) {
        return res.status(403).json({ message: 'Refresh token inválido o expirado. Por favor, inicie sesión de nuevo.' });
    }
};

// @desc    Obtener el perfil del usuario actualmente logueado
// @route   GET /api/auth/profile
export const getMe = async (req, res) => {
    // req.user es añadido por el middleware 'protect'
    res.status(200).json(req.user);
};
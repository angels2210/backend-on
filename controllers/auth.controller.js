import jwt from 'jsonwebtoken';
import { User, Role } from '../models/index.js';
import bcrypt from 'bcryptjs';


// @desc    Autenticar un usuario y obtener tokens
// @route   POST /api/auth/login
export const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        if (!username || !password) {
            return res.status(400).json({ message: 'Por favor, proporcione un usuario y contraseña.' });
        }

        const user = await User.findOne({ 
            where: { username },
            include: { model: Role } 
        });

        if (user && await bcrypt.compare(password, user.password)) {
            const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
                expiresIn: '15m',
            });
            const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
                expiresIn: '1h',
            });

            const { password: _, ...userWithoutPassword } = user.toJSON();

            res.json({
                accessToken,
                refreshToken,
                user: userWithoutPassword,
            });
        } else {
            res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
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
    // req.user es añadido por el middleware 'protect' y ya contiene la información que necesitamos.
    res.status(200).json(req.user);
};

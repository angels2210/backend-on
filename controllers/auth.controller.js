import jwt from 'jsonwebtoken';
import { User, Role } from '../models/index.js';
import bcrypt from 'bcryptjs';

// --- FUNCIÓN DE LOGIN ACTUALIZADA CON COOKIES ---
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

        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                // Generamos ambos tokens como antes
                const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
                    expiresIn: '15m', // 15 minutos
                });
                const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
                    expiresIn: '1h', // 1 hora
                });

                // --- CAMBIO: ENVIAMOS TOKENS COMO COOKIES SEGURAS ---
                res.cookie('accessToken', accessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 15 * 60 * 1000, // 15 minutos
                });

                res.cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 60 * 60 * 1000, // 1 hora
                });
                
                const { password: _, ...userWithoutPassword } = user.toJSON();

                // Enviamos solo los datos del usuario en la respuesta
                return res.json({ user: userWithoutPassword });
            }
        }

        return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });

    } catch (error) {
        console.error('Error en el login:', error);
        return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// --- FUNCIÓN DE REFRESH TOKEN ACTUALIZADA ---
export const refreshToken = async (req, res) => {
    // Leemos el token desde la cookie
    const token = req.cookies.refreshToken;

    if (!token) {
        return res.status(401).json({ message: 'No se proporcionó un refresh token.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado.' });
        }

        // Generamos y enviamos un nuevo accessToken como cookie
        const newAccessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: '15m',
        });

        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000,
        });

        res.status(200).json({ message: 'Token de acceso actualizado' });

    } catch (error) {
        return res.status(403).json({ message: 'Refresh token inválido o expirado. Por favor, inicie sesión de nuevo.' });
    }
};

// --- FUNCIÓN DE LOGOUT AÑADIDA ---
export const logout = (req, res) => {
    // Limpiamos ambas cookies
    res.cookie('accessToken', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    res.cookie('refreshToken', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    return res.status(200).json({ message: 'Sesión cerrada exitosamente' });
};


// @desc    Obtener el perfil del usuario actualmente logueado
// @route   GET /api/auth/profile
export const getMe = async (req, res) => {
    // req.user es añadido por el middleware 'protect'
    res.status(200).json(req.user);
};
import jwt from 'jsonwebtoken';
import { User, Role } from '../models/index.js';
import bcrypt from 'bcryptjs';


// @desc    Autenticar un usuario y obtener un token
// @route   POST /api/auth/login
export const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        if (!username || !password) {
            return res.status(400).json({ message: 'Por favor, proporcione un usuario y contraseña.' });
        }

        // Buscamos al usuario e incluimos su rol para devolver toda la información necesaria.
        const user = await User.findOne({ 
            where: { username },
            include: { model: Role } 
        });

        // Verificamos si el usuario existe y si la contraseña es correcta usando el método del modelo.
        if (user && await bcrypt.compare(password, user.password)) {
            // Creamos el token JWT
            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
                expiresIn: '1d', // El token expirará en 1 día
            });

            // Excluimos la contraseña del objeto de usuario que devolvemos
            const { password: _, ...userWithoutPassword } = user.toJSON();

            res.json({
                token,
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

// @desc    Obtener el perfil del usuario actualmente logueado
// @route   GET /api/auth/profile
export const getMe = async (req, res) => {
    // req.user es añadido por el middleware 'protect' y ya contiene la información que necesitamos.
    res.status(200).json(req.user);
};
import jwt from 'jsonwebtoken';
import { User, Role } from '../models/index.js';

// Middleware para proteger rutas, asegurando que el usuario esté logueado.
export const protect = async (req, res, next) => {
    let token;

    // --- CAMBIO PRINCIPAL: Buscamos el token en las cookies ---
    if (req.cookies.accessToken) {
        try {
            // 1. Obtenemos el token directamente de la cookie 'accessToken'
            token = req.cookies.accessToken;

            // 2. Verificamos el token con la clave secreta del .env
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Obtenemos el usuario del token y adjuntamos su Rol y permisos.
            req.user = await User.findByPk(decoded.id, {
                attributes: { exclude: ['password'] }, // Excluimos la contraseña por seguridad
                include: {
                    model: Role, // Incluimos el modelo Role para traer los permisos
                },
            });

            if (!req.user) {
                return res.status(401).json({ message: 'No autorizado, usuario no encontrado' });
            }

            // 4. Si todo es correcto, pasamos al siguiente middleware.
            next();

        } catch (error) {
            console.error('Error de autenticación:', error);
            // Este error puede ocurrir si el token es inválido o ha expirado.
            return res.status(401).json({ message: 'No autorizado, el token ha fallado' });
        }
    }

    // Si después de revisar las cookies, no encontramos un token...
    if (!token) {
        return res.status(401).json({ message: 'No autorizado, no se encontró un token' });
    }
};


// Middleware para autorizar basado en permisos específicos (no necesita cambios).
export const authorize = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user || !req.user.Role) {
            return res.status(403).json({ message: 'Acceso prohibido. No se pudo determinar el rol del usuario.' });
        }

        const userPermissions = req.user.Role.permissions || {};
        
        const hasPermission = requiredPermissions.some(
            (p) => userPermissions[p] === true
        );
        
        if (!hasPermission) {
            return res.status(403).json({ message: 'No tiene los permisos necesarios para realizar esta acción.' });
        }

        next();
    };
};
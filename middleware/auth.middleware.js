import jwt from 'jsonwebtoken';
import { User, Role } from '../models/index.js';

// Middleware para proteger rutas, asegurando que el usuario esté logueado.
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 1. Obtener el token del header (ej. "Bearer eyJhbGciOi...")
      token = req.headers.authorization.split(' ')[1];

      // 2. Verificar el token con la clave secreta
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Obtener el usuario del token y, crucialmente, incluir su Rol y permisos.
      //    Esto evita tener que consultar la base de datos de nuevo más adelante.
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }, // Excluimos la contraseña por seguridad
        include: {
          model: Role, // Incluimos el modelo Role para traer los permisos
        },
      });

      if (!req.user) {
        return res.status(401).json({ message: 'No autorizado, usuario no encontrado' });
      }

      // 4. Si todo es correcto, pasamos al siguiente middleware o controlador.
      next();
    } catch (error) {
      console.error('Error de autenticación:', error);
      return res.status(401).json({ message: 'No autorizado, el token ha fallado' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No autorizado, no se encontró un token' });
  }
};

// Middleware para autorizar basado en permisos específicos.
// Se usa después de 'protect'.
export const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    // Gracias a 'protect', req.user y req.user.Role ya están disponibles.
    if (!req.user || !req.user.Role) {
      return res.status(403).json({ message: 'Acceso prohibido. No se pudo determinar el rol del usuario.' });
    }

    const userPermissions = req.user.Role.permissions || {};

    // Verificamos si el usuario tiene AL MENOS UNO de los permisos requeridos.
    const hasPermission = requiredPermissions.some(
      (p) => userPermissions[p] === true
    );
 // --- AÑADE ESTAS LÍNEAS DE DEPURACIÓN ---
  console.log('--- [DEBUG PERMISOS] ---');
  console.log('Acción requiere:', requiredPermissions);
  console.log('Usuario tiene:', Object.keys(userPermissions).filter(p => userPermissions[p])); // Muestra solo los permisos activos
  console.log('¿Permiso concedido?:', hasPermission);
  console.log('--------------------------');
  // --- FIN DE LAS LÍNEAS DE DEPURACIÓN ---
    if (!hasPermission) {
      return res.status(403).json({ message: 'No tiene los permisos necesarios para realizar esta acción.' });
    }

    next();
  };
};
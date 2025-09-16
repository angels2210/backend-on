import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { sequelize, syncDatabase } from './models/index.js';

// Importar todas las rutas
import authRoutes from './routes/auth.routes.js';
import companyInfoRoutes from './routes/companyInfo.routes.js'; // <-- MOVIMOS ESTA LÍNEA HACIA ARRIBA
import clientRoutes from './routes/client.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import userRoutes from './routes/user.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import vehicleRoutes from './routes/vehicle.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import officeRoutes from './routes/office.routes.js';
import roleRoutes from './routes/role.routes.js';
import categoryRoutes from './routes/category.routes.js';
import shippingTypeRoutes from './routes/shippingType.routes.js';
import paymentMethodRoutes from './routes/paymentMethod.routes.js';
import expenseCategoryRoutes from './routes/expenseCategory.routes.js';
import assetCategoryRoutes from './routes/assetCategory.routes.js';
import assetRoutes from './routes/asset.routes.js';
import auditLogRoutes from './routes/auditLog.routes.js';
import cuentaContableRoutes from './routes/cuentaContable.routes.js';
import productRoutes from './routes/product.routes.js';
import asociadoRoutes from './routes/asociado.routes.js'; 

// Cargar variables de entorno
dotenv.config();

const app = express();

// Middlewares
app.use(cors()); // Permite peticiones desde el frontend
// CAMBIO: Aumentamos el límite del tamaño de las peticiones para poder subir imágenes.
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));

// --- ORDEN DE RUTAS CORREGIDO ---
// 1. Rutas de autenticación (login)
app.use('/api/auth', authRoutes);
// 2. Ruta pública para la información de la empresa (para la pantalla de login)
app.use('/api/company-info', companyInfoRoutes);
// 3. El resto de las rutas (que sí requieren protección)
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/shipping-types', shippingTypeRoutes); // Corregido para usar el nombre correcto del archivo
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/expense-categories', expenseCategoryRoutes);
app.use('/api/asset-categories', assetCategoryRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/cuentas-contables', cuentaContableRoutes);
app.use('/api/products', productRoutes);
app.use('/api/asociados', asociadoRoutes);



// --- Lógica de arranque del servidor y conexión a la BD ---

const startServer = async () => {
    try {
        // 1. Autenticar la conexión con la base de datos
        await sequelize.authenticate();
        console.log('Conexión con PostgreSQL establecida correctamente.');

        // 2. Sincronizar los modelos con la base de datos
        await syncDatabase();
        console.log('Tablas sincronizadas correctamente.');

        // Ruta de prueba
        app.get('/api', (req, res) => {
            res.json({ message: 'API de Transporte Alianza funcionando correctamente.' });
        });

        // --- Iniciar el servidor Express ---
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));

    } catch (error) {
        console.error('No se pudo iniciar el servidor:', error);
        process.exit(1); // Detiene la aplicación si hay un error crítico
    }
};

// Llamar a la función para arrancar todo el proceso
startServer();
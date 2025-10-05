import { 
    sequelize, Role, User, Office, Asociado, Vehicle, Client, Supplier,
    CompanyInfo, CuentaContable, AssetCategory, Asset, ExpenseCategory,
    PaymentMethod, ShippingType, Category, Product, Invoice, AsientoManual, AsientoManualEntry
} from './models/index.js';

// Importante: Se necesita para encriptar la contraseña del usuario de prueba
import bcrypt from 'bcryptjs';

// (La lista de permisos queda igual...)
const ALL_PERMISSION_KEYS = [
    'dashboard.view', 'shipping-guide.view', 'invoices.view', 'invoices.create', 'invoices.edit', 
    'invoices.delete', 'invoices.void', 'invoices.changeStatus', 'flota.view', 'flota.create', 
    'flota.edit', 'flota.delete', 'flota.dispatch', 'remesas.view', 'remesas.create', 'remesas.delete',
    'asociados.view', 'asociados.create', 'asociados.edit', 'asociados.delete', 'asociados.pagos.create',
    'asociados.pagos.delete', 'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
    'proveedores.view', 'proveedores.create', 'proveedores.edit', 'proveedores.delete', 'libro-contable.view',
    'libro-contable.create', 'libro-contable.edit', 'libro-contable.delete', 'inventario.view',
    'inventario-envios.view', 'inventario-bienes.view', 'inventario-bienes.create', 'inventario-bienes.edit',
    'inventario-bienes.delete', 'bienes-categorias.view', 'bienes-categorias.create', 'bienes-categorias.edit',
    'bienes-categorias.delete', 'reports.view', 'auditoria.view', 'configuracion.view', 'config.company.edit',
    'config.users.manage', 'config.users.edit_protected', 'config.users.manage_tech_users', 'config.roles.manage',
    'categories.view', 'categories.create', 'categories.edit', 'categories.delete', 'offices.view',
    'offices.create', 'offices.edit', 'offices.delete', 'shipping-types.view', 'shipping-types.create',
    'shipping-types.edit', 'shipping-types.delete', 'payment-methods.view', 'payment-methods.create',
    'payment-methods.edit', 'payment-methods.delete'
];

const seedDatabase = async () => {
  try {
    console.log('Iniciando la siembra de datos...');
    // Sincroniza la base de datos, alterando las tablas si es necesario
    await sequelize.sync({ alter: true });

    // (La sección de permisos queda igual...)
    const adminPermissions = ALL_PERMISSION_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {});
    const techPermissions = { ...adminPermissions };
    const operatorPermissions = {
        'dashboard.view': true, 'shipping-guide.view': true, 'invoices.view': true,
        'invoices.create': true, 'invoices.edit': true, 'invoices.changeStatus': true,
        'flota.view': true, 'remesas.view': true, 'asociados.view': true, 'clientes.view': true,
        'clientes.create': true, 'clientes.edit': true, 'reports.view': true,
    };

    // --- 1. Roles y Permisos ---
    console.log('Sembrando Roles y Permisos...');
    await Role.bulkCreate([
        { id: 'role-admin', name: 'Administrador', permissions: adminPermissions },
        { id: 'role-op', name: 'Operador', permissions: operatorPermissions },
        { id: 'role-tech', name: 'Soporte Técnico', permissions: techPermissions }
    ], { updateOnDuplicate: ['name', 'permissions'] });
    console.log('Roles y permisos actualizados.');

    // --- 2. Información de la Empresa ---
    console.log('Sembrando Información de la Empresa...');
    await CompanyInfo.findOrCreate({
        where: { id: 1 },
        defaults: {
            id: 1,
            name: 'Transporte Alianza C.A.',
            rif: 'J-12345678-9',
            address: 'Av. Principal, Edificio Central, Piso 1, Caracas, Venezuela',
            phone: '0212-555-1234',
            costPerKg: 10.5,
            bcvRate: 36.50,
            lastInvoiceNumber: 1,
        }
    });
    console.log('Información de la empresa verificada o creada.');

    // --- 3. Oficinas ---
    console.log('Sembrando Oficinas...');
    await Office.bulkCreate([
        { id: 'office-caracas', code: 'CCS', name: 'Oficina Principal - Caracas', address: 'Av. Urdaneta, Caracas', phone: '0212-111-2233' },
        { id: 'office-valencia', code: 'VLN', name: 'Sucursal Valencia', address: 'Zona Industrial, Valencia', phone: '0241-444-5566' }
    ], { updateOnDuplicate: ['name', 'address', 'phone', 'code'] });
    console.log('Oficinas sembradas.');

    // --- 4. Usuarios ---
    console.log('Sembrando Usuarios...');
    const hashedPassword = await bcrypt.hash('123', 10);
    await User.bulkCreate([
        { id: 'user-admin', name: 'Administrador Principal', username: 'admin', password: hashedPassword, roleId: 'role-admin', officeId: 'office-caracas' },
        { id: 'user-operador', name: 'Juan Operador', username: 'operador', password: hashedPassword, roleId: 'role-op', officeId: 'office-valencia' }
    ], { updateOnDuplicate: ['name', 'password', 'roleId', 'officeId'] });
    console.log('Usuarios sembrados.');

    // --- 5. Catálogos Varios ---
    console.log('Sembrando Catálogos (Métodos de Pago, Tipos de Envío, etc.)...');
    await PaymentMethod.bulkCreate([
        { id: 'pm-efectivo', name: 'Efectivo', type: 'Efectivo' },
        { id: 'pm-zelle', name: 'Zelle', type: 'Transferencia' },
        { id: 'pm-bs', name: 'Transferencia Bs.', type: 'Transferencia', bankName: 'Banesco', accountNumber: '0134-1234-56-7890123456' }
    ], { updateOnDuplicate: ['name', 'type', 'bankName', 'accountNumber'] });

    await ShippingType.bulkCreate([
        { id: 'st-estandar', name: 'Envío Estándar' },
        { id: 'st-expreso', name: 'Envío Expreso' }
    ], { updateOnDuplicate: ['name'] });

    await Category.bulkCreate([
        { id: 'cat-electronica', name: 'Electrónica' },
        { id: 'cat-ropa', name: 'Ropa y Calzado' }
    ], { updateOnDuplicate: ['name'] });

    await ExpenseCategory.bulkCreate([
        { id: 'exp-cat-oficina', name: 'Suministros de Oficina' },
        { id: 'exp-cat-combustible', name: 'Combustible y Lubricantes' }
    ], { updateOnDuplicate: ['name'] });

    await AssetCategory.bulkCreate([
        { id: 'asset-cat-pc', name: 'Equipos de Computación' },
        { id: 'asset-cat-muebles', name: 'Mobiliario y Equipo' }
    ], { updateOnDuplicate: ['name'] });
    console.log('Catálogos sembrados.');

    // --- 6. Entidades Principales (Clientes, Proveedores, Asociados) ---
    console.log('Sembrando Clientes, Proveedores y Asociados...');
    await Client.bulkCreate([
        { id: 'client-1', idNumber: 'V-12345678-9', clientType: 'persona', name: 'Maria Rodriguez', phone: '0414-1234567', address: 'La Candelaria, Caracas' },
        { id: 'client-2', idNumber: 'J-87654321-0', clientType: 'empresa', name: 'Comercial XYZ', phone: '0212-9876543', address: 'El Rosal, Caracas' }
    ], { updateOnDuplicate: ['name', 'phone', 'address', 'clientType'] });

    await Supplier.bulkCreate([
        { id: 'supp-1', idNumber: 'J-11223344-5', name: 'Repuestos El Gato', phone: '0212-1112233', address: 'Quinta Crespo' },
        { id: 'supp-2', idNumber: 'J-55667788-9', name: 'Papelería El Lápiz', phone: '0212-4445566', address: 'Sabana Grande' }
    ], { updateOnDuplicate: ['name', 'phone', 'address'] });

    await Asociado.bulkCreate([
        { id: 'asoc-1', codigo: 'A001', nombre: 'Pedro Pérez', cedula: 'V-8765432-1', fechaIngreso: '2020-01-15' },
        { id: 'asoc-2', codigo: 'A002', nombre: 'Ana Gómez', cedula: 'V-9876543-2', fechaIngreso: '2021-05-20' }
    ], { updateOnDuplicate: ['nombre', 'cedula', 'fechaIngreso'] });
    console.log('Entidades principales sembradas.');

    // --- 7. Entidades Dependientes (Vehículos, Activos) ---
    console.log('Sembrando Vehículos y Activos...');
    await Vehicle.bulkCreate([
        { id: 'vehicle-1', asociadoId: 'asoc-1', placa: 'AB123CD', modelo: 'Ford Cargo 815', capacidadCarga: 5000, status: 'Disponible' },
        { id: 'vehicle-2', asociadoId: 'asoc-2', placa: 'XY456Z', modelo: 'Chevrolet NPR', capacidadCarga: 4500, status: 'Disponible' }
    ], { updateOnDuplicate: ['asociadoId', 'modelo', 'capacidadCarga', 'status'] });

    await Asset.bulkCreate([
        { id: 'asset-1', code: 'PC-001', name: 'Laptop Gerencia', purchaseValue: 1200, officeId: 'office-caracas', categoryId: 'asset-cat-pc' },
        { id: 'asset-2', code: 'ES-005', name: 'Escritorio Operador', purchaseValue: 300, officeId: 'office-valencia', categoryId: 'asset-cat-muebles' }
    ], { updateOnDuplicate: ['name', 'purchaseValue', 'officeId', 'categoryId'] });
    console.log('Entidades dependientes sembradas.');

    // --- 8. Plan de Cuentas Contables ---
    console.log('Sembrando Plan de Cuentas...');
    await CuentaContable.bulkCreate([
        { id: 'cta-1101', codigo: '1101', nombre: 'Caja', tipo: 'Activo' },
        { id: 'cta-1102', codigo: '1102', nombre: 'Bancos', tipo: 'Activo' },
        { id: 'cta-1105', codigo: '1105', nombre: 'Cuentas por Cobrar - Clientes', tipo: 'Activo' },
        { id: 'cta-2101', codigo: '2101', nombre: 'Cuentas por Pagar - Proveedores', tipo: 'Pasivo' },
        { id: 'cta-4101', codigo: '4101', nombre: 'Ingresos por Servicios de Transporte', tipo: 'Ingreso' },
        { id: 'cta-5101', codigo: '5101', nombre: 'Gasto de Combustible', tipo: 'Gasto' }
    ], { updateOnDuplicate: ['nombre', 'tipo'] });
    console.log('Plan de cuentas sembrado.');

    // --- 9. Asiento Manual de Ejemplo ---
    console.log('Sembrando Asiento Manual de ejemplo...');
    const [asiento, created] = await AsientoManual.findOrCreate({
        where: { id: 'am-seed-1' },
        defaults: {
            id: 'am-seed-1',
            fecha: new Date(),
            descripcion: 'Asiento de apertura de caja',
            userId: 'user-admin'
        }
    });
    if (created) {
        await AsientoManualEntry.bulkCreate([
            { id: 'ame-1', asientoManualId: asiento.id, cuentaId: 'cta-1101', debe: 500.00, haber: 0.00 },
            { id: 'ame-2', asientoManualId: asiento.id, cuentaId: 'cta-1102', debe: 0.00, haber: 500.00 }
        ]);
        console.log('Asiento manual de ejemplo creado.');
    } else {
        console.log('Asiento manual de ejemplo ya existía.');
    }

    // --- 10. Factura de Ejemplo ---
    console.log('Sembrando Factura de ejemplo...');
    await Invoice.findOrCreate({
        where: { id: 'inv-seed-1' },
        defaults: {
            id: 'inv-seed-1',
            invoiceNumber: 'F-000001',
            controlNumber: '00000001',
            date: new Date(),
            clientName: 'Maria Rodriguez',
            clientIdNumber: 'V-12345678-9',
            totalAmount: 116.00,
            status: 'Activa',
            paymentStatus: 'Pendiente',
            shippingStatus: 'Pendiente para Despacho',
            guide: {
                sender: { id: 'client-1', name: 'Maria Rodriguez', idNumber: 'V-12345678-9' },
                receiver: { id: 'client-2', name: 'Comercial XYZ', idNumber: 'J-87654321-0', address: 'El Rosal, Caracas' },
                merchandise: [{ quantity: 2, description: 'Cajas de repuestos', weight: 10, price: 58 }]
            }
        }
    });
    console.log('Factura de ejemplo verificada o creada.');

  } catch (error) {
    console.error('Error durante la siembra de datos:', error);
  } finally {
    await sequelize.close();
    console.log('Conexión con la base de datos cerrada.');
  }
};

seedDatabase();
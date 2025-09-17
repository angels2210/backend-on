import { sequelize, Role, User, Asociado, Vehicle, Certificado, PagoAsociado, ReciboPagoAsociado } from './models/index.js';

// Lista completa y actualizada de todos los permisos del sistema.
const ALL_PERMISSION_KEYS = [
    // Dashboard
    'dashboard.view',
    // Guía de Envío (Crear Factura)
    'shipping-guide.view',
    // Facturas
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete', 'invoices.void', 'invoices.changeStatus',
    // Flota
    'flota.view', 'flota.create', 'flota.edit', 'flota.delete', 'flota.dispatch',
    // Remesas
    'remesas.view', 'remesas.create', 'remesas.delete',
    // Asociados
    'asociados.view', 'asociados.create', 'asociados.edit', 'asociados.delete', 
    'asociados.pagos.create', 'asociados.pagos.delete',
    // Clientes
    'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
    // Proveedores
    'proveedores.view', 'proveedores.create', 'proveedores.edit', 'proveedores.delete',
    // Libro Contable
    'libro-contable.view', 'libro-contable.create', 'libro-contable.edit', 'libro-contable.delete',
    // Inventario
    'inventario.view',
    'inventario-envios.view',
    'inventario-bienes.view', 'inventario-bienes.create', 'inventario-bienes.edit', 'inventario-bienes.delete',
    'bienes-categorias.view', 'bienes-categorias.create', 'bienes-categorias.edit', 'bienes-categorias.delete',
    // Reportes
    'reports.view',
    // Auditoria
    'auditoria.view',
    // Configuracion
    'configuracion.view',
    'config.company.edit',
    'config.users.manage', 'config.users.edit_protected', 'config.users.manage_tech_users',
    'config.roles.manage',
    // Sub-módulos de Configuración
    'categories.view', 'categories.create', 'categories.edit', 'categories.delete',
    'offices.view', 'offices.create', 'offices.edit', 'offices.delete',
    'shipping-types.view', 'shipping-types.create', 'shipping-types.edit', 'shipping-types.delete',
    'payment-methods.view', 'payment-methods.create', 'payment-methods.edit', 'payment-methods.delete',
];

const seedDatabase = async () => {
  try {
    console.log('Iniciando la siembra de datos...');
    await sequelize.sync({ alter: true });

    // --- Permisos para cada Rol ---
    const adminPermissions = ALL_PERMISSION_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {});
    const techPermissions = { ...adminPermissions }; // Soporte técnico tiene todos los permisos
    const operatorPermissions = {
        'dashboard.view': true,
        'shipping-guide.view': true,
        'invoices.view': true,
        'invoices.create': true,
        'invoices.edit': true,
        'invoices.changeStatus': true,
        'flota.view': true,
        'remesas.view': true,
        'asociados.view': true,
        'clientes.view': true,
        'clientes.create': true,
        'clientes.edit': true,
        'reports.view': true,
    };
    
    // --- Creación/Actualización de Roles ---
    const [adminRole] = await Role.findOrCreate({
      where: { id: 'role-admin' },
      defaults: { id: 'role-admin', name: 'Administrador', permissions: adminPermissions }
    });
    adminRole.permissions = adminPermissions;
    await adminRole.save();
    console.log('Permisos del rol "Administrador" actualizados.');

    const [opRole] = await Role.findOrCreate({
      where: { id: 'role-op' },
      defaults: { id: 'role-op', name: 'Operador', permissions: operatorPermissions }
    });
    opRole.permissions = operatorPermissions; // Siempre actualiza por si hay nuevos permisos para operadores
    await opRole.save();
    console.log('Permisos del rol "Operador" actualizados.');

    const [techRole] = await Role.findOrCreate({
      where: { id: 'role-tech' },
      defaults: { id: 'role-tech', name: 'Soporte Técnico', permissions: techPermissions }
    });
    techRole.permissions = techPermissions;
    await techRole.save();
    console.log('Permisos del rol "Soporte Técnico" actualizados.');

    // --- Creación de Usuarios Base ---
    await User.findOrCreate({
      where: { username: 'admin' },
      defaults: { id: 'user-admin', name: 'Administrador Principal', username: 'admin', password: '123', roleId: adminRole.id }
    });
    console.log('Usuario "admin" verificado o creado.');

    await User.findOrCreate({
      where: { username: 'tecnologia' },
      defaults: { id: 'user-tech', name: 'Soporte Técnico', username: 'tecnologia', password: '123', roleId: techRole.id }
    });
    console.log('Usuario "tecnologia" verificado o creado.');

    // --- Creación de Datos de Prueba para Módulo de Asociados ---
    const [asociado1] = await Asociado.findOrCreate({
        where: { codigo: 'A001' },
        defaults: {
            id: 'asoc-1',
            codigo: 'A001',
            nombre: 'Juan Perez',
            cedula: 'V-12345678',
            fechaNacimiento: '1980-01-15',
            fechaIngreso: '2020-05-20',
            telefono: '0414-1234567',
            direccion: 'Caracas, Venezuela',
            status: 'Activo'
        }
    });

    const [vehicle1] = await Vehicle.findOrCreate({
        where: { placa: 'AB123CD' },
        defaults: {
            id: 'v-1',
            asociadoId: asociado1.id,
            placa: 'AB123CD',
            modelo: 'Mack Granite',
            ano: 2018,
            color: 'Blanco',
            serialCarroceria: 'XYZ123',
            serialMotor: 'MOT456',
            capacidadCarga: 25000, // 25 Toneladas
            status: 'Disponible',
            driver: 'Juan Perez'
        }
    });

    await Certificado.findOrCreate({
        where: { vehiculoId: vehicle1.id, descripcion: 'Certificado de Circulación' },
        defaults: {
            id: 'cert-1',
            vehiculoId: vehicle1.id,
            descripcion: 'Certificado de Circulación',
            fechaInicio: '2023-01-01',
            status: 'Activo'
        }
    });

    await PagoAsociado.findOrCreate({
        where: { asociadoId: asociado1.id, concepto: 'Cuota Mantenimiento Enero' },
        defaults: {
            id: 'pago-1',
            asociadoId: asociado1.id,
            concepto: 'Cuota Mantenimiento Enero',
            cuotas: '1/12',
            montoBs: 500.00,
            fechaVencimiento: '2025-01-31',
            status: 'Pendiente'
        }
    });
    
    console.log('Datos de prueba para Asociados creados o verificados.');

  } catch (error) {
    console.error('Error durante la siembra de datos:', error);
  } finally {
    await sequelize.close();
    console.log('Conexión con la base de datos cerrada.');
  }
};

seedDatabase();
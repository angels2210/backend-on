import { sequelize, Role, User } from './models/index.js';

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

    // (La sección de roles queda igual...)
    const [adminRole] = await Role.findOrCreate({ where: { id: 'role-admin' }, defaults: { id: 'role-admin', name: 'Administrador', permissions: adminPermissions } });
    adminRole.permissions = adminPermissions; await adminRole.save();
    const [opRole] = await Role.findOrCreate({ where: { id: 'role-op' }, defaults: { id: 'role-op', name: 'Operador', permissions: operatorPermissions } });
    opRole.permissions = operatorPermissions; await opRole.save();
    const [techRole] = await Role.findOrCreate({ where: { id: 'role-tech' }, defaults: { id: 'role-tech', name: 'Soporte Técnico', permissions: techPermissions } });
    techRole.permissions = techPermissions; await techRole.save();
    console.log('Roles y permisos actualizados.');

    // --- CORRECCIÓN FINAL ---
    // Pasamos la contraseña en texto plano y dejamos que el modelo se encargue de encriptarla.
    await User.findOrCreate({
      where: { username: 'admin' },
      defaults: { 
        id: 'user-admin', 
        name: 'Administrador Principal', 
        username: 'admin', 
        password: '123', // <-- CONTRASEÑA SIN ENCRIPTAR
        roleId: adminRole.id 
      }
    });
    console.log('Usuario "admin" verificado o creado. La encriptación la maneja el modelo.');

  } catch (error) {
    console.error('Error durante la siembra de datos:', error);
  } finally {
    await sequelize.close();
    console.log('Conexión con la base de datos cerrada.');
  }
};

seedDatabase();
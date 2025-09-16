import { sequelize, Role, User } from './models/index.js';

// Estos son todos los permisos posibles en tu sistema.
const ALL_PERMISSION_KEYS = [
    'dashboard.view', 'shipping-guide.view', 'invoices.view', 'invoices.create', 
    'invoices.edit', 'invoices.void', 'invoices.delete', 'invoices.changeStatus',
    'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
    'proveedores.view', 'proveedores.create', 'proveedores.edit', 'proveedores.delete',
    'flota.view', 'flota.create', 'flota.edit', 'flota.delete', 'flota.dispatch',
    'libro-contable.view', 'libro-contable.create', 'libro-contable.edit', 'libro-contable.delete',
    'inventario.view', 'inventario-envios.view', 'inventario-bienes.view', 'inventario-bienes.create',
    'inventario-bienes.edit', 'inventario-bienes.delete', 'bienes-categorias.view', 'bienes-categorias.create',
    'bienes-categorias.edit', 'bienes-categorias.delete', 'reports.view', 'auditoria.view',
    'configuracion.view', 'config.company.edit', // <-- ESTE ES EL PERMISO CLAVE
    'config.users.manage', 'config.roles.manage',
    'config.users.edit_protected', 'config.users.manage_tech_users', 'categories.view', 'categories.create',
    'categories.edit', 'categories.delete', 'offices.view', 'offices.create', 'offices.edit', 'offices.delete',
    'shipping-types.view', 'shipping-types.create', 'shipping-types.edit', 'shipping-types.delete',
    'payment-methods.view', 'payment-methods.create', 'payment-methods.edit', 'payment-methods.delete'
];

const seedDatabase = async () => {
  try {
    console.log('Iniciando la siembra de datos...');
    await sequelize.sync({ alter: true });

    // --- BLOQUE AÑADIDO PARA CORREGIR EL ENUM ---
    try {
        console.log('Asegurando que el tipo ENUM "shippingStatus" esté actualizado...');
        await sequelize.query(`ALTER TYPE "enum_Invoices_shippingStatus" ADD VALUE IF NOT EXISTS 'Entregada'`);
        console.log('El valor "Entregada" ha sido añadido al ENUM si no existía.');
    } catch (error) {
        if (error.message.includes("does not exist")) {
            console.log('El tipo ENUM "enum_Invoices_shippingStatus" no existe todavía, se creará correctamente.');
        } else if (error.message.includes("already exists")) {
            console.log('El valor "Entregada" ya existe en el ENUM.');
        } else {
            console.error('Error al actualizar el ENUM:', error.message);
        }
    }
    // --- FIN DEL BLOQUE AÑADIDO ---

    const adminPermissions = ALL_PERMISSION_KEYS.reduce((acc, key) => {
        acc[key] = true;
        return acc;
    }, {});

    const [adminRole] = await Role.findOrCreate({
      where: { id: 'role-admin' },
      defaults: { id: 'role-admin', name: 'Administrador', permissions: adminPermissions }
    });
    adminRole.permissions = adminPermissions;
    await adminRole.save();
    console.log('Permisos del rol Administrador actualizados.');

    await Role.findOrCreate({
      where: { id: 'role-op' },
      defaults: { id: 'role-op', name: 'Operador', permissions: { 'dashboard.view': true, 'invoices.view': true } }
    });

    // Buscamos o creamos el rol de Soporte Técnico, que también tendrá todos los permisos
    const [techRole] = await Role.findOrCreate({
      where: { id: 'role-tech' },
      defaults: { id: 'role-tech', name: 'Soporte Técnico', permissions: adminPermissions }
    });
    techRole.permissions = adminPermissions;
    await techRole.save();
    console.log('Permisos del rol Soporte Técnico actualizados.');

    console.log('Roles creados o verificados.');

    // Crear Usuario Administrador
    await User.findOrCreate({
      where: { username: 'admin' },
      defaults: {
        id: 'user-admin',
        name: 'Administrador Principal',
        username: 'admin',
        password: '123',
        roleId: adminRole.id
      }
    });
    console.log('Usuario "admin" verificado o creado.');

    // --- AÑADIDO: Bloque para crear el usuario "tecnologia" ---
    await User.findOrCreate({
      where: { username: 'tecnologia' },
      defaults: {
        id: 'user-tech',
        name: 'Soporte Técnico',
        username: 'tecnologia',
        password: '123', // Puedes cambiar la contraseña aquí
        roleId: techRole.id // Se le asigna el rol de Soporte Técnico
      }
    });
    console.log('Usuario "tecnologia" verificado o creado.');
    // --- FIN DEL BLOQUE AÑADIDO ---

  } catch (error) {
    console.error('Error durante la siembra de datos:', error);
  } finally {
    await sequelize.close();
    console.log('Conexión con la base de datos cerrada.');
  }
};

seedDatabase();
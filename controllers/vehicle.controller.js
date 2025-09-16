import { Vehicle, Invoice, sequelize } from '../models/index.js';

// --- CRUD Básico para Vehículos ---

export const getVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.findAll({ order: [['modelo', 'ASC']] });
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener vehículos', error: error.message });
    }
};

export const createVehicle = async (req, res) => {
    // 1. Extraemos los campos necesarios del cuerpo de la petición.
    const { asociadoId, placa, modelo, capacidadCarga } = req.body;

    // 2. Verificamos que los campos obligatorios no estén vacíos.
    if (!asociadoId || !placa || !modelo || !capacidadCarga) {
        return res.status(400).json({ 
            message: 'Faltan campos obligatorios. Asegúrese de proporcionar asociado, placa, modelo y capacidad de carga.' 
        });
    }

    try {
        // 3. Si todo está bien, creamos el vehículo.
        const newVehicle = await Vehicle.create({ 
            id: `v-${Date.now()}`, 
            ...req.body 
        });
        res.status(201).json(newVehicle);
    } catch (error) {
        // Logueamos el error para depuración en el servidor
        console.error('Error al crear vehículo:', error); 
        res.status(500).json({ message: 'Error al crear vehículo', error: error.message });
    }
};

export const updateVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findByPk(req.params.id);
        if (!vehicle) return res.status(404).json({ message: 'Vehículo no encontrado' });
        await vehicle.update(req.body);
        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar vehículo', error: error.message });
    }
};

export const deleteVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findByPk(req.params.id);
        if (!vehicle) return res.status(404).json({ message: 'Vehículo no encontrado' });
        await vehicle.destroy();
        res.json({ message: 'Vehículo eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar vehículo', error: error.message });
    }
};

// --- Lógica de Operaciones de Flota ---

// Asigna un grupo de facturas a un vehículo
export const assignInvoicesToVehicle = async (req, res) => {
    const { vehicleId } = req.params;
    const { invoiceIds } = req.body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ message: 'Se requiere un array de IDs de facturas (invoiceIds).' });
    }

    try {
        const [updatedCount] = await Invoice.update(
            { vehicleId: vehicleId },
            { where: { id: invoiceIds } }
        );

        if (updatedCount > 0) {
            res.json({ message: `${updatedCount} factura(s) asignada(s) correctamente.` });
        } else {
            res.status(404).json({ message: 'No se encontraron facturas con los IDs proporcionados.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al asignar facturas al vehículo', error: error.message });
    }
};

// Desasigna una factura de un vehículo
export const unassignInvoiceFromVehicle = async (req, res) => {
    const { invoiceId } = req.body;

    if (!invoiceId) {
        return res.status(400).json({ message: 'Se requiere el ID de la factura (invoiceId).' });
    }

    try {
        const [updatedCount] = await Invoice.update(
            { vehicleId: null },
            { where: { id: invoiceId } }
        );

        if (updatedCount > 0) {
            res.json({ message: 'Factura desasignada correctamente.' });
        } else {
            res.status(404).json({ message: 'No se encontró la factura especificada.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al desasignar la factura', error: error.message });
    }
};


// Marca un vehículo como 'En Ruta' y sus facturas como 'En Tránsito'
export const dispatchVehicle = async (req, res) => {
    const { id: vehicleId } = req.params;
    const t = await sequelize.transaction(); // Iniciar transacción

    try {
        // 1. Identifica todas las facturas asignadas al vehículo con estado 'Pendiente para Despacho'
        const invoicesToDispatch = await Invoice.findAll({
            where: {
                vehicleId: vehicleId,
                shippingStatus: 'Pendiente para Despacho'
            },
            transaction: t
        });

        if (invoicesToDispatch.length === 0) {
            await t.rollback();
            return res.status(404).json({ message: 'No se encontraron facturas pendientes para despachar en este vehículo.' });
        }

        const invoiceIds = invoicesToDispatch.map(inv => inv.id);
        const vehicle = await Vehicle.findByPk(vehicleId, { transaction: t });
        if (!vehicle) {
            await t.rollback();
            return res.status(404).json({ message: 'Vehículo no encontrado.' });
        }


        // 2. Crea un nuevo registro de Remesa con los IDs de las facturas encontradas
        const newRemesa = await Remesa.create({
            id: `rem-${Date.now()}`,
            remesaNumber: `REM-${Date.now().toString().slice(-6)}`,
            date: new Date(),
            asociadoId: vehicle.asociadoId,
            vehicleId: vehicleId,
            invoiceIds: invoiceIds,
            totalAmount: invoicesToDispatch.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
            totalPackages: invoicesToDispatch.reduce((sum, inv) => sum + inv.guide.merchandise.reduce((p, m) => p + (m.quantity || 0), 0), 0),
            // --- CAMBIO CLAVE AQUÍ ---
            // Se asegura de que si m.weight o m.quantity no existen, se usará 0, evitando errores.
            totalWeight: invoicesToDispatch.reduce((sum, inv) =>
                sum + (inv.guide.merchandise?.reduce((p, m) => p + ((m.weight || 0) * (m.quantity || 0)), 0) || 0), 0),
        }, { transaction: t });

        // 3. Actualiza el estado de las facturas a 'En Tránsito' y les asigna el remesaId
        await Invoice.update(
            {
                shippingStatus: 'En Tránsito',
                remesaId: newRemesa.id
            },
            { where: { id: invoiceIds }, transaction: t }
        );

        // 4. Actualiza el estado del vehículo a 'En Ruta'
        await vehicle.update({ status: 'En Ruta' }, { transaction: t });

        await t.commit();

        const updatedInvoices = await Invoice.findAll({ where: { id: invoiceIds } });
        await vehicle.reload();

        res.status(200).json({
            message: `Vehículo ${vehicle.placa} despachado con la remesa ${newRemesa.remesaNumber}.`,
            newRemesa,
            updatedInvoices,
            updatedVehicle: vehicle
        });

    } catch (error) {
        await t.rollback();
        console.error('Error al despachar el vehículo:', error);
        res.status(500).json({ message: 'Error al despachar el vehículo', error: error.message });
    }
};


// Finaliza el viaje, marca las facturas como 'Entregada' y libera el vehículo
export const finalizeTrip = async (req, res) => {
    const { id: vehicleId } = req.params;
    const t = await sequelize.transaction();
    try {
        const vehicle = await Vehicle.findByPk(vehicleId, { transaction: t });
        if (!vehicle) {
            await t.rollback();
            return res.status(404).json({ message: 'Vehículo no encontrado.' });
        }

        await vehicle.update({ status: 'Disponible' }, { transaction: t });

        await Invoice.update(
            { shippingStatus: 'Entregada', vehicleId: null }, // Desasignamos el vehículo
            { where: { vehicleId: vehicleId }, transaction: t }
        );

        await t.commit();
        res.json({ message: `Viaje del vehículo ${vehicle.placa} finalizado.` });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Error al finalizar el viaje', error: error.message });
    }
};
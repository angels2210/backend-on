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
    const { invoiceIds } = req.body;
    const { id: vehicleId } = req.params;

    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ message: 'Se requiere un array de IDs de facturas.' });
    }

    try {
        await Invoice.update(
            { vehicleId: vehicleId },
            { where: { id: invoiceIds } }
        );
        res.json({ message: `${invoiceIds.length} factura(s) asignada(s) correctamente.` });
    } catch (error) {
        res.status(500).json({ message: 'Error al asignar las facturas', error: error.message });
    }
};

// Desasigna una factura de un vehículo
export const unassignInvoiceFromVehicle = async (req, res) => {
    const { invoiceId } = req.body;
    try {
        await Invoice.update(
            { vehicleId: null },
            { where: { id: invoiceId } }
        );
        res.json({ message: 'Factura desasignada correctamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al desasignar la factura', error: error.message });
    }
};


// Marca un vehículo como 'En Ruta' y sus facturas como 'En Tránsito'
export const dispatchVehicle = async (req, res) => {
    const { id: vehicleId } = req.params;
    const t = await sequelize.transaction();
    try {
        const vehicle = await Vehicle.findByPk(vehicleId, { transaction: t });
        if (!vehicle) {
            await t.rollback();
            return res.status(404).json({ message: 'Vehículo no encontrado.' });
        }

        await vehicle.update({ status: 'En Ruta' }, { transaction: t });

        await Invoice.update(
            { shippingStatus: 'En Tránsito' },
            { where: { vehicleId: vehicleId }, transaction: t }
        );

        await t.commit();
        res.json({ message: `Vehículo ${vehicle.placa} despachado.` });
    } catch (error) {
        await t.rollback();
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
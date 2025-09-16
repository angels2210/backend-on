import { Remesa, Invoice, sequelize } from '../models/index.js';

export const getRemesas = async (req, res) => {
    try {
        const remesas = await Remesa.findAll({ order: [['date', 'DESC']] });
        res.json(remesas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener remesas', error: error.message });
    }
};

export const createRemesa = async (req, res) => {
    const { vehicleId, invoiceIds } = req.body;
    const t = await sequelize.transaction();
    try {
        // 1. Calcular totales a partir de las facturas
        const invoices = await Invoice.findAll({ where: { id: invoiceIds }, transaction: t });
        if (invoices.length !== invoiceIds.length) {
            throw new Error('Una o más facturas no fueron encontradas.');
        }

        const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalPackages = invoices.reduce((sum, inv) => sum + inv.guide.merchandise.reduce((p, m) => p + m.quantity, 0), 0);
        // Aquí deberíamos tener una función para calcular el peso, la importaremos en un futuro
        const totalWeight = 0; // Placeholder

        // 2. Crear la remesa
        const newRemesa = await Remesa.create({
            ...req.body,
            id: `rem-${Date.now()}`,
            remesaNumber: `REM-${Date.now().toString().slice(-6)}`,
            totalAmount,
            totalPackages,
            totalWeight
        }, { transaction: t });

        // 3. Asociar la remesa a las facturas
        await Invoice.update(
            { remesaId: newRemesa.id },
            { where: { id: invoiceIds }, transaction: t }
        );

        await t.commit();
        res.status(201).json(newRemesa);
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Error al crear la remesa', error: error.message });
    }
};

export const deleteRemesa = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const remesa = await Remesa.findByPk(req.params.id, { transaction: t });
        if (!remesa) return res.status(404).json({ message: 'Remesa no encontrada' });

        // Desvincular facturas
        await Invoice.update(
            { remesaId: null },
            { where: { remesaId: req.params.id }, transaction: t }
        );

        await remesa.destroy({ transaction: t });
        
        await t.commit();
        res.json({ message: 'Remesa eliminada y facturas desvinculadas' });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Error al eliminar la remesa', error: error.message });
    }
};
import { Invoice, CompanyInfo } from '../models/index.js';
import { sequelize } from '../config/db.js';

export const getInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.findAll({ order: [['invoiceNumber', 'DESC']] });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las facturas', error: error.message });
    }
};

export const createInvoice = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const companyInfo = await CompanyInfo.findByPk(1, { transaction: t, lock: true });
        if (!companyInfo) {
            throw new Error('Información de la empresa no encontrada.');
        }

        const newInvoiceNumber = (companyInfo.lastInvoiceNumber || 0) + 1;
        const newControlNumber = String(newInvoiceNumber).padStart(6, '0');

        const newInvoice = await Invoice.create({
            ...req.body,
            id: `inv-${Date.now()}`,
            invoiceNumber: newInvoiceNumber,
            controlNumber: newControlNumber,
            status: 'Activa', // CAMBIO CLAVE: Una nueva factura siempre nace 'Activa'.
            paymentStatus: 'Pendiente',
            shippingStatus: 'Pendiente para Despacho',
        }, { transaction: t });

        companyInfo.lastInvoiceNumber = newInvoiceNumber;
        await companyInfo.save({ transaction: t });

        await t.commit();
        res.status(201).json(newInvoice);
    } catch (error) {
        await t.rollback();
        console.error('Error al crear factura:', error);
        res.status(500).json({ message: 'Error al crear la factura', error: error.message });
    }
};

export const updateInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
        await invoice.update(req.body);
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la factura', error: error.message });
    }
};

export const deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
        await invoice.destroy();
        res.json({ message: 'Factura eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la factura', error: error.message });
    }
};
import { Invoice, CompanyInfo, Client, InventoryItem, sequelize } from '../models/index.js';
import { sendInvoiceToHKA } from '../services/theFactoryAPI.service.js';

export const getInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.findAll({ order: [['invoiceNumber', 'DESC']] });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las facturas', error: error.message });
    }
};

export const createInvoice = async (req, res) => {
    // Start a managed transaction. Sequelize will automatically commit or roll back.
    const t = await sequelize.transaction();
    try {
        const { guide, ...invoiceData } = req.body;
        const { sender, receiver } = guide;

        // 1. Validate client data
        const validateClient = (client, type) => {
            if (!client || !client.idNumber || !client.name) {
                throw new Error(`Los datos del ${type} están incompletos.`);
            }
        };
        validateClient(sender, 'remitente');
        validateClient(receiver, 'destinatario');

        // 2. Find or create clients within the transaction
        const [senderClient] = await Client.findOrCreate({
            where: { idNumber: sender.idNumber },
            defaults: { ...sender, id: `C-${Date.now()}` },
            transaction: t
        });
        const [receiverClient] = await Client.findOrCreate({
            where: { idNumber: receiver.idNumber },
            defaults: { ...receiver, id: `C-${Date.now() + 1}` },
            transaction: t
        });

        // 3. Lock the CompanyInfo row and get the next invoice number
        const companyInfo = await CompanyInfo.findByPk(1, { transaction: t, lock: t.LOCK.UPDATE });
        if (!companyInfo) {
            throw new Error('Información de la empresa no encontrada.');
        }

        const nextInvoiceNum = (companyInfo.lastInvoiceNumber || 0) + 1;
        const newInvoiceNumberFormatted = `F-${String(nextInvoiceNum).padStart(6, '0')}`;
        const newControlNumber = String(nextInvoiceNum).padStart(8, '0');
        
        // 4. Update the counter within the same transaction
        companyInfo.lastInvoiceNumber = nextInvoiceNum;
        await companyInfo.save({ transaction: t });

        // 5. Create the new invoice
        const newInvoice = await Invoice.create({
            ...invoiceData,
            id: `INV-${Date.now()}`,
            invoiceNumber: newInvoiceNumberFormatted,
            controlNumber: newControlNumber,
            clientName: senderClient.name,
            clientIdNumber: senderClient.idNumber,
            guide: { ...guide, sender: { ...sender, id: senderClient.id }, receiver: { ...receiver, id: receiverClient.id } },
            status: 'Activa',
            paymentStatus: 'Pendiente',
            shippingStatus: 'Pendiente para Despacho',
        }, { transaction: t });
        
        // If everything above succeeded, the transaction will be committed.
        await t.commit();

        res.status(201).json(newInvoice);

    } catch (error) {
        // If any step fails, the transaction is rolled back automatically.
        await t.rollback();
        console.error('Error al crear la factura:', error);
        res.status(500).json({ message: error.message || 'Error al crear la factura' });
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

export const sendInvoiceToTheFactory = async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        // Llama al servicio que acabamos de crear
        const hkaResponse = await sendInvoiceToHKA(invoice);

        // (Opcional) Aquí podrías guardar el estado en tu base de datos.
        // Por ejemplo, añadiendo un campo `hkaStatus` a tu modelo Invoice.
        // await invoice.update({ hkaStatus: 'enviada', hkaResponse: hkaResponse });

        res.status(200).json({ message: 'Factura enviada exitosamente a The Factory HKA.', hkaResponse });

    } catch (error) {
        res.status(500).json({ message: error.message || 'Error al enviar la factura.' });
    }
};
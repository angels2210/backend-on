import { Invoice, Client, InventoryItem, sequelize } from '../models/index.js';


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
        const { guide, clientName, clientIdNumber, ...invoiceData } = req.body;
        const { sender, receiver, merchandise } = guide;

        const validateClient = (client, type) => {
            if (!client || !client.idNumber || !client.name || !client.phone || !client.address) {
                throw new Error(`Los datos del ${type} están incompletos. Por favor, llene todos los campos (Nombre, Cédula/RIF, Teléfono, Dirección).`);
            }
        };

        validateClient(sender, 'remitente');
        validateClient(receiver, 'destinatario');

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

        const finalGuide = {
            ...guide,
            sender: { ...sender, id: senderClient.id },
            receiver: { ...receiver, id: receiverClient.id }
        };

        const newInvoice = await Invoice.create({
            ...invoiceData,
            id: `INV-${Date.now()}`,
            clientName: senderClient.name,
            clientIdNumber: senderClient.idNumber,
            guide: finalGuide,
            status: 'Activa',
            paymentStatus: finalGuide.paymentType === 'flete-pagado' ? 'Pendiente' : 'Pendiente',
            shippingStatus: 'Pendiente para Despacho',
        }, { transaction: t });

        // Esta parte ahora funcionará porque 'InventoryItem' ya fue importado
        for (const item of merchandise) {
            await InventoryItem.create({
                id: `ITEM-${Date.now()}-${Math.random()}`,
                invoiceId: newInvoice.id,
                invoiceNumber: newInvoice.invoiceNumber,
                sku: `SKU-${item.categoryId}-${Date.now()}`,
                name: item.description,
                description: `Paquete de ${item.weight}kg`,
                stock: item.quantity,
                unit: 'unidad',
                shippingStatus: 'Pendiente para Despacho',
                weight: item.weight * item.quantity,
            }, { transaction: t });
        }

        await t.commit();
        res.status(201).json(newInvoice);
    } catch (error) {
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
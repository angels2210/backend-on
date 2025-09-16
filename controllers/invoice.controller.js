import { Invoice, CompanyInfo, Client, InventoryItem, sequelize } from '../models/index.js';


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
        // Excluimos invoiceNumber del body para evitar que el frontend lo sobreescriba
        const { guide, clientName, clientIdNumber, invoiceNumber, ...invoiceData } = req.body;
        const { sender, receiver, merchandise } = guide;

        // 1. Validar datos del remitente y destinatario
        const validateClient = (client, type) => {
            if (!client || !client.idNumber || !client.name || !client.phone || !client.address) {
                throw new Error(`Los datos del ${type} están incompletos. Por favor, llene todos los campos.`);
            }
        };
        validateClient(sender, 'remitente');
        validateClient(receiver, 'destinatario');

        // 2. Asegurar que los clientes existan o crearlos
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

        // 3. Obtener el correlativo de la empresa
        const companyInfo = await CompanyInfo.findByPk(1, { transaction: t, lock: true });
        if (!companyInfo) {
            throw new Error('Información de la empresa no encontrada.');
        }

        // 4. Generar el nuevo número de factura y control en el formato correcto
        const nextInvoiceNum = (companyInfo.lastInvoiceNumber || 0) + 1;
        const newInvoiceNumberFormatted = `F-${String(nextInvoiceNum).padStart(6, '0')}`;
        const newControlNumber = String(nextInvoiceNum).padStart(8, '0');

        // 5. Crear la factura con los datos generados por el backend
        const newInvoice = await Invoice.create({
            ...invoiceData,
            id: `INV-${Date.now()}`,
            invoiceNumber: newInvoiceNumberFormatted, // Usamos el número con formato
            controlNumber: newControlNumber,
            clientName: senderClient.name,
            clientIdNumber: senderClient.idNumber,
            guide: { ...guide, sender: { ...sender, id: senderClient.id }, receiver: { ...receiver, id: receiverClient.id } },
            status: 'Activa',
            paymentStatus: 'Pendiente',
            shippingStatus: 'Pendiente para Despacho',
        }, { transaction: t });

        // 6. Actualizar el correlativo en la información de la empresa
        companyInfo.lastInvoiceNumber = nextInvoiceNum;
        await companyInfo.save({ transaction: t });
        
        // ... (el resto de la lógica para InventoryItem no cambia)

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
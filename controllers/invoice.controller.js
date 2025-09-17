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
    // 1. Inicia una transacción para asegurar la integridad de los datos
    const t = await sequelize.transaction();

    try {
        // --- CAMBIO CLAVE ---
        // Desestructuramos el body, ignorando explícitamente los IDs que pueda enviar el frontend.
        // Solo tomamos los datos que nos interesan.
        const { guide, totalAmount, date, ...otherData } = req.body;
        const { sender, receiver, merchandise } = guide;

        // 2. Validar que los datos del remitente y destinatario están completos
        const validateClient = (client, type) => {
            if (!client || !client.idNumber || !client.name || !client.phone || !client.address) {
                throw new Error(`Los datos del ${type} están incompletos. Por favor, llene todos los campos.`);
            }
        };
        validateClient(sender, 'remitente');
        validateClient(receiver, 'destinatario');

        // 3. Busca o crea los clientes (remitente y destinatario)
        // Esto previene clientes duplicados y asegura que existan en la BD
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

        // 4. Obtiene el correlativo actual de la empresa de forma segura (con bloqueo)
        const companyInfo = await CompanyInfo.findByPk(1, { transaction: t, lock: true });
        if (!companyInfo) {
            throw new Error('No se pudo encontrar la configuración de la empresa para generar el correlativo.');
        }

        // 5. Genera el SIGUIENTE número de factura y control de forma segura
        const nextInvoiceNum = (companyInfo.lastInvoiceNumber || 0) + 1;
        const newInvoiceNumberFormatted = `F-${String(nextInvoiceNum).padStart(6, '0')}`;
        const newControlNumber = String(nextInvoiceNum).padStart(8, '0');

        // 6. Crea la factura en la base de datos con los datos CORRECTOS y GENERADOS por el backend
        const newInvoice = await Invoice.create({
            ...otherData, // Resto de datos del body
            id: `INV-${Date.now()}`, // El ID de la factura lo generamos aquí para que sea único
            invoiceNumber: newInvoiceNumberFormatted, // El número de factura generado
            controlNumber: newControlNumber,        // El número de control generado
            date: date,
            totalAmount: totalAmount,
            clientName: senderClient.name,
            clientIdNumber: senderClient.idNumber,
            // Actualizamos la guía con los IDs de cliente correctos de la BD
            guide: { ...guide, sender: { ...sender, id: senderClient.id }, receiver: { ...receiver, id: receiverClient.id } },
            status: 'Activa',
            paymentStatus: 'Pendiente',
            shippingStatus: 'Pendiente para Despacho',
        }, { transaction: t });

        // 7. Actualiza el número de la última factura en la tabla de la empresa
        companyInfo.lastInvoiceNumber = nextInvoiceNum;
        await companyInfo.save({ transaction: t });
        
        // 8. Si todo fue exitoso, confirma la transacción
        await t.commit();
        res.status(201).json(newInvoice);

    } catch (error) {
        // 9. Si algo falla, revierte TODOS los cambios hechos en la transacción
        await t.rollback();
        console.error('Error detallado al crear la factura:', error);
        res.status(500).json({ message: error.message || 'Error interno del servidor al crear la factura.' });
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
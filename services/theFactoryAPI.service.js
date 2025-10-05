import axios from 'axios';
import dotenv from 'dotenv';
import { CompanyInfo } from '../models/index.js';

dotenv.config();

const API_URL_AUTH = 'https://demoemisionv2.thefactoryhka.com.ve/api/autenticacion';
const API_URL_EMISION = 'https://demoemisionv2.thefactoryhka.com.ve/api/Emision';

// --- MEJORA: Caché en memoria para el token ---
let cachedToken = {
    token: null,
    expires: 0, // Timestamp de expiración
};

// Función para obtener el token, con caché.
const getAuthToken = async () => {
    try {
        console.log("Intentando autenticar con The Factory HKA...");
        const usuario = process.env.HKA_USUARIO;
        const clave = process.env.HKA_CLAVE;

        if (!usuario || !clave) {
            throw new Error('Las credenciales HKA_USUARIO y HKA_CLAVE no están definidas en el archivo .env');
        }

        // Si tenemos un token y no ha expirado, lo reutilizamos.
        if (cachedToken.token && Date.now() < cachedToken.expires) {
            console.log("Usando token de HKA cacheado.");
            return cachedToken.token;
        }

        console.log("Solicitando nuevo token de HKA...");
        const response = await axios.post(API_URL_AUTH, {
            usuario: usuario,
            clave: clave
        });

        if (!response.data?.token) {
            throw new Error('La respuesta de la API de autenticación no contenía un token.');
        }

        // Guardamos el token y calculamos su tiempo de expiración (ej: 50 minutos para un token de 1 hora)
        cachedToken.token = response.data.token;
        cachedToken.expires = Date.now() + 50 * 60 * 1000; // Cache por 50 mins
        console.log("Token de HKA obtenido exitosamente.");
        return cachedToken.token;

    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!! ERROR DE AUTENTICACIÓN HKA !!!!!!!!!!!!!!!!!!");
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
        } else {
            console.error('Error', error.message);
        }
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        throw new Error('No se pudo autenticar con The Factory HKA. Revisa las credenciales.');
    }
};

export const sendInvoiceToHKA = async (invoice) => {
    try {
        // --- MEJORA: Obtener datos de la empresa desde la BD ---
        const companyInfo = await CompanyInfo.findByPk(1);
        if (!companyInfo) {
            throw new Error('No se encontró la información de la empresa para la facturación.');
        }

        const token = await getAuthToken();

        // --- MEJORA: Formato de fecha y hora simplificado ---
        const [serie, numero] = invoice.invoiceNumber.split('-');
        const fechaEmision = new Date(invoice.date);

        // --- CORRECCIÓN: Asegurar formato dd/MM/AAAA con ceros iniciales ---
        // Usamos UTC para evitar problemas de zona horaria con DATEONLY
        const day = String(fechaEmision.getUTCDate()).padStart(2, '0');
        const month = String(fechaEmision.getUTCMonth() + 1).padStart(2, '0'); // getMonth() es 0-indexado
        const year = fechaEmision.getUTCFullYear();
        const fechaFormateada = `${day}/${month}/${year}`;

        const horaFormateada = new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Caracas' }).toLowerCase(); // hh:mm:ss am/pm
        
        // --- MEJORA: Lógica de impuestos más clara ---
        const IVA_RATE = 0.16; // 16%
        let subTotalGeneral = 0;
        let ivaGeneral = 0;

        const detalles = (invoice.guide?.merchandise || []).map((item, index) => {
            const precioUnitario = typeof item.price === 'number' ? item.price : 0;
            const cantidad = typeof item.quantity === 'number' ? item.quantity : 0;
            const totalItemConIva = precioUnitario * cantidad;
            
            // Asumimos que el precio unitario ya incluye el IVA
            const itemSubtotal = totalItemConIva / (1 + IVA_RATE);
            const itemIva = totalItemConIva - itemSubtotal;
            const precioUnitarioSinIva = precioUnitario / (1 + IVA_RATE);

            subTotalGeneral += itemSubtotal;
            ivaGeneral += itemIva;

            return {
                "numeroLinea": (index + 1).toString(),
                "codigoProducto": item.sku || `GEN-${index + 1}`, // Usar SKU si existe
                "descripcion": item.description,
                "cantidad": cantidad.toString(),
                "precioUnitario": precioUnitarioSinIva.toFixed(2).toString(),
                "montoTotal": itemSubtotal.toFixed(2).toString(),
                "impuestos": [{"codigo": "01", "porcentaje": (IVA_RATE * 100).toFixed(2), "monto": itemIva.toFixed(2).toString()}]
            };
        });

        const totalGeneral = subTotalGeneral + ivaGeneral;

        // --- MEJORA: Tipo de identificación del comprador dinámico ---
        const idType = (invoice.clientIdNumber.charAt(0) || 'V').toUpperCase();
        
        const hkaInvoicePayload = {
            "documentoElectronico": {
                "encabezado": {
                    "identificacionDocumento": {
                        "tipoDocumento": "01",
                        "serie": serie,
                        "numeroDocumento": numero,
                        "fechaEmision": fechaFormateada,
                        "horaEmision": horaFormateada,
                        "tipoDeVenta": "1",
                        "moneda": "VES",
                    },
                    "emisor": {
                        "tipoIdentificacion": (companyInfo.rif.charAt(0) || 'J').toUpperCase(),
                        "numeroIdentificacion": companyInfo.rif,
                        "razonSocial": companyInfo.name,
                        "direccion": companyInfo.address,
                        "telefono": companyInfo.phone
                    },
                    "comprador": {
                        "tipoIdentificacion": idType,
                        "numeroIdentificacion": invoice.clientIdNumber,
                        "razonSocial": invoice.clientName,
                        "direccion": invoice.guide?.receiver?.address || 'N/A',
                        "pais": "VE"
                    }
                },
                "detallesItems": detalles, // CORRECCIÓN: Renombrado de "detalles" a "detallesItems"
                "totales": {               // CORRECCIÓN: Agrupado dentro del objeto "totales"
                    "subTotal": subTotalGeneral.toFixed(2).toString(),
                    "total": totalGeneral.toFixed(2).toString(),
                    "impuestos": [{"codigo": "01", "porcentaje": (IVA_RATE * 100).toFixed(2), "monto": ivaGeneral.toFixed(2).toString()}]
                }
            }
        };

        console.log("================== ENVIANDO A HKA (ESTRUCTURA FINAL) ==================");
        console.log(JSON.stringify(hkaInvoicePayload, null, 2));
        console.log("=======================================================================");

        const response = await axios.post(API_URL_EMISION, hkaInvoicePayload, {
            headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'}
        });

        console.log('✅ ¡Factura enviada a HKA con éxito!:', response.data);
        return response.data;

    } catch (error) {
        // --- MEJORA: Manejo de errores más detallado ---
        console.error("!!!!!!!!!!!!!!!!!! ERROR EN API HKA !!!!!!!!!!!!!!!!!!");
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
        } else {
            console.error('Error:', error.message);
        }
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

        // Extraer el mensaje de error más útil para el frontend
        let detailedError = error.message || 'Error de comunicación con la API de HKA.';
        if (error.response?.data?.validaciones) {
            detailedError = error.response.data.validaciones.join('; ');
        } else if (error.response?.data?.errors) { // A veces los errores vienen en un objeto
            detailedError = Object.values(error.response.data.errors).flat().join('; ');
        } else if (error.response?.data?.mensaje) {
            detailedError = error.response.data.mensaje;
        }
        throw new Error(detailedError);
    }
};
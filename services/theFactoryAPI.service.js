import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL_AUTH = 'https://demoemisionv2.thefactoryhka.com.ve/api/autenticacion';
const API_URL_EMISION = 'https://demoemisionv2.thefactoryhka.com.ve/api/Emision';

const getAuthToken = async () => {
    try {
        console.log("Intentando autenticar con The Factory HKA...");
        const usuario = process.env.HKA_USUARIO;
        const clave = process.env.HKA_CLAVE;

        if (!usuario || !clave) {
            throw new Error('Las credenciales HKA_USUARIO y HKA_CLAVE no están definidas en el archivo .env');
        }

        const response = await axios.post(API_URL_AUTH, {
            usuario: usuario,
            clave: clave
        });

        const token = response.data.token;
        if (!token) {
            throw new Error('La respuesta de la API de autenticación no contenía un token.');
        }

        console.log("Token de HKA obtenido exitosamente.");
        return token;

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
        const token = await getAuthToken();

        const [serie, numero] = invoice.invoiceNumber.split('-');
        const fechaParts = invoice.date.split('-');
        const fechaFormateada = `${fechaParts[2]}/${fechaParts[1]}/${fechaParts[0]}`;
        
        const ahora = new Date();
        let hours = ahora.getHours();
        const minutes = ahora.getMinutes();
        const seconds = ahora.getSeconds();
        const ampm = (hours >= 12 ? 'PM' : 'AM').toLowerCase();
        hours = hours % 12;
        hours = hours ? hours : 12;
        const strMinutes = minutes < 10 ? '0' + minutes : minutes;
        const strSeconds = seconds < 10 ? '0' + seconds : seconds;
        const strHours = hours < 10 ? '0' + hours : hours;
        const horaFormateada = `${strHours}:${strMinutes}:${strSeconds} ${ampm}`;

        let subTotalGeneral = 0;
        let ivaGeneral = 0;

        const detalles = (invoice.guide?.merchandise || []).map((item, index) => {
            const precioUnitario = typeof item.price === 'number' ? item.price : 0;
            const cantidad = typeof item.quantity === 'number' ? item.quantity : 0;
            const itemSubtotal = (precioUnitario * cantidad) / 1.16;
            const itemIva = (precioUnitario * cantidad) - itemSubtotal;
            subTotalGeneral += itemSubtotal;
            ivaGeneral += itemIva;
            return {
                "numeroLinea": (index + 1).toString(),
                "codigoProducto": "COD-GENERICO",
                "descripcion": item.description,
                "cantidad": cantidad.toString(),
                "precioUnitario": (itemSubtotal / cantidad).toFixed(2).toString(),
                "montoTotal": itemSubtotal.toFixed(2).toString(),
                "impuestos": [{"codigo": "01", "porcentaje": "16.00", "monto": itemIva.toFixed(2).toString()}]
            };
        });

        const totalGeneral = subTotalGeneral + ivaGeneral;
        
        const hkaInvoicePayload = {
            "documentoElectronico": {
                "encabezado": {
                    "identificacionDocumento": {
                        "tipoDocumento": "01",
                        "serie": serie || 'F',
                        "numeroDocumento": numero || invoice.invoiceNumber,
                        "fechaEmision": fechaFormateada,
                        "horaEmision": horaFormateada,
                        "tipoDeVenta": "1",
                        "moneda": "VES",
                    },
                    "emisor": {
                        "tipoIdentificacion": "J",
                        "numeroIdentificacion": "J-12345678-9",
                        "razonSocial": "AC LA FRATERNIDAD",
                        "direccion": "DIRECCION FISCAL DE TU EMPRESA",
                        "telefono": "0212-1234567"
                    },
                    "comprador": {
                        "tipoIdentificacion": "V",
                        "numeroIdentificacion": invoice.clientIdNumber,
                        "razonSocial": invoice.clientName,
                        "direccion": invoice.guide?.receiver?.address || 'N/A',
                        "pais": "VE"
                    }
                },
                "detalles": detalles,
                "subTotal": subTotalGeneral.toFixed(2).toString(),
                "total": totalGeneral.toFixed(2).toString(),
                "impuestos": [{"codigo": "01", "porcentaje": "16.00", "monto": ivaGeneral.toFixed(2).toString()}]
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
        console.error("!!!!!!!!!!!!!!!!!! ERROR EN API HKA !!!!!!!!!!!!!!!!!!");
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
        } else {
            console.error('Error', error.message);
        }
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

        let detailedError = 'Error de comunicación con la API.';
        if (error.response?.data?.validaciones) {
            detailedError = error.response.data.validaciones.join('; ');
        } else if (error.response?.data?.mensaje) {
            detailedError = error.response.data.mensaje;
        }
        throw new Error(detailedError);
    }
};
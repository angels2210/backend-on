// controllers/companyInfo.controller.js

import { CompanyInfo } from '../models/index.js';
import axios from 'axios';

// @desc    Obtener la información de la empresa
// @route   GET /api/company-info
export const getCompanyInfo = async (req, res) => {
    try {
        let companyInfo = await CompanyInfo.findOne();
        if (!companyInfo) {
            companyInfo = await CompanyInfo.create({
                name: 'Nombre de tu Empresa',
                rif: 'J-00000000-0',
                address: 'Dirección Fiscal',
                phone: '000-0000000',
                costPerKg: 10,
                bcvRate: 36.5,
                lastInvoiceNumber: 0,
            });
        }
        res.json(companyInfo);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la información de la empresa' });
    }
};

// @desc    Actualizar la información de la empresa
// @route   PUT /api/company-info
export const updateCompanyInfo = async (req, res) => {
    try {
        let companyInfo = await CompanyInfo.findOne();
        if (companyInfo) {
            await companyInfo.update(req.body);
        } else {
            companyInfo = await CompanyInfo.create(req.body);
        }
        res.json(companyInfo);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la información de la empresa' });
    }
};

// @desc    Obtener la última tasa de cambio del BCV
// @route   GET /api/company-info/bcv-rate
export const getLatestBcvRate = async (req, res) => {
    try {
        // Hacemos una petición a la API pública que no requiere clave
        const response = await axios.get('https://ve.dolarapi.com/v1/dolares/oficial');
        const rate = response.data.price;

        if (!rate) {
            return res.status(404).json({ message: 'No se pudo obtener la tasa de cambio.' });
        }
        res.json({ rate });
    } catch (error) {
        console.error('Error al obtener la tasa del BCV:', error.message);
        res.status(500).json({ message: 'Error en el servidor al obtener la tasa.' });
    }
};
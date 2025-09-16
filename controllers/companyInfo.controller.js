import { CompanyInfo } from '../models/index.js';

// @desc    Obtener la información de la empresa
// @route   GET /api/company-info
export const getCompanyInfo = async (req, res) => {
    try {
        // Busca o crea el registro de configuración con ID 1
        const [info, created] = await CompanyInfo.findOrCreate({
            where: { id: 1 },
            defaults: {
                id: 1,
                name: 'Nombre de tu Empresa',
                rif: 'J-00000000-0',
            }
        });
        res.json(info);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la información de la empresa', error: error.message });
    }
};

// @desc    Actualizar la información de la empresa
// @route   PUT /api/company-info
export const updateCompanyInfo = async (req, res) => {
    try {
        const info = await CompanyInfo.findByPk(1);
        if (info) {
            await info.update(req.body);
            res.json(info);
        } else {
            // Si por alguna razón no existe, la creamos
            const newInfo = await CompanyInfo.create({ id: 1, ...req.body });
            res.status(201).json(newInfo);
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la información de la empresa', error: error.message });
    }
};
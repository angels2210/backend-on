import express from 'express';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/role.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);
// Se requiere este permiso para cualquier acción sobre roles
router.use(authorize('config.roles.manage')); 

router.route('/')
    .get(getRoles)
    .post(createRole);

router.route('/:id')
    .put(updateRole)
    .delete(deleteRole);

export default router;
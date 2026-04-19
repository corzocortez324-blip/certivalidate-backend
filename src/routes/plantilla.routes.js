const express = require('express')
const router = express.Router()

const { verificarToken } = require('../middlewares/auth.middleware')
const {
  listarPlantillas,
  obtenerPlantilla,
  crearPlantilla,
  actualizarPlantilla,
  archivarPlantilla,
} = require('../controllers/plantilla.controller')
const { requirePermission, cargarInstitucionesUsuario } = require('../utils/authorization')
const {
  validatePlantilla,
  validateUUIDParam,
  handleValidationErrors,
} = require('../utils/validators')

router.get('/', verificarToken, cargarInstitucionesUsuario, requirePermission('plantilla', 'listar'), listarPlantillas)
router.get(
  '/:id',
  verificarToken,
  cargarInstitucionesUsuario,
  requirePermission('plantilla', 'ver'),
  validateUUIDParam('id'),
  handleValidationErrors,
  obtenerPlantilla,
)
router.post(
  '/',
  verificarToken,
  cargarInstitucionesUsuario,
  requirePermission('plantilla', 'crear', {
    institucionIdResolver: (req) => req.body.institucion_id,
  }),
  validatePlantilla,
  handleValidationErrors,
  crearPlantilla,
)
router.put(
  '/:id',
  verificarToken,
  cargarInstitucionesUsuario,
  requirePermission('plantilla', 'actualizar'),
  validateUUIDParam('id'),
  validatePlantilla,
  handleValidationErrors,
  actualizarPlantilla,
)

router.delete(
  '/:id',
  verificarToken,
  cargarInstitucionesUsuario,
  requirePermission('plantilla', 'archivar'),
  validateUUIDParam('id'),
  handleValidationErrors,
  archivarPlantilla,
)

module.exports = router

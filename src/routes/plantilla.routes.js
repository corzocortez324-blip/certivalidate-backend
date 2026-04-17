const express = require('express')
const router = express.Router()

const verificarToken = require('../middlewares/auth.middleware')
const {
  listarPlantillas,
  obtenerPlantilla,
  crearPlantilla,
  actualizarPlantilla,
} = require('../controllers/plantilla.controller')
const { requirePermission } = require('../utils/authorization')
const {
  validatePlantilla,
  validateUUIDParam,
  handleValidationErrors,
} = require('../utils/validators')

router.get('/', verificarToken, requirePermission('plantilla', 'listar'), listarPlantillas)
router.get(
  '/:id',
  verificarToken,
  requirePermission('plantilla', 'ver'),
  validateUUIDParam('id'),
  handleValidationErrors,
  obtenerPlantilla,
)
router.post(
  '/',
  verificarToken,
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
  requirePermission('plantilla', 'actualizar'),
  validateUUIDParam('id'),
  validatePlantilla,
  handleValidationErrors,
  actualizarPlantilla,
)

module.exports = router

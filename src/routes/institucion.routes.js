const express = require('express')
const router = express.Router()

const verificarToken = require('../middlewares/auth.middleware')
const {
  listarInstituciones,
  obtenerInstitucion,
  crearInstitucion,
  actualizarInstitucion,
  desactivarInstitucion,
  obtenerEstadisticasInstitucion,
} = require('../controllers/institucion.controller')
const { requirePermission } = require('../utils/authorization')
const {
  validateInstitucion,
  validateUUIDParam,
  handleValidationErrors,
} = require('../utils/validators')

router.get('/', verificarToken, requirePermission('institucion', 'ver'), listarInstituciones)
router.get(
  '/:id',
  verificarToken,
  requirePermission('institucion', 'ver'),
  validateUUIDParam('id'),
  handleValidationErrors,
  obtenerInstitucion,
)
router.get(
  '/:id/estadisticas',
  verificarToken,
  requirePermission('institucion', 'estadisticas'),
  validateUUIDParam('id'),
  handleValidationErrors,
  obtenerEstadisticasInstitucion,
)
router.post('/', verificarToken, validateInstitucion, handleValidationErrors, crearInstitucion)
router.put(
  '/:id',
  verificarToken,
  requirePermission('institucion', 'actualizar'),
  validateUUIDParam('id'),
  validateInstitucion,
  handleValidationErrors,
  actualizarInstitucion,
)
router.patch(
  '/:id/desactivar',
  verificarToken,
  requirePermission('institucion', 'actualizar'),
  validateUUIDParam('id'),
  handleValidationErrors,
  desactivarInstitucion,
)

module.exports = router

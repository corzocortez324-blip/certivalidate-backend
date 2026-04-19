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
const { requirePermission, cargarInstitucionesUsuario } = require('../utils/authorization')
const {
  validateInstitucionCrear,
  validateInstitucionActualizar,
  validateUUIDParam,
  handleValidationErrors,
} = require('../utils/validators')

router.get('/', verificarToken, cargarInstitucionesUsuario, requirePermission('institucion', 'ver'), listarInstituciones)
router.get(
  '/:id',
  verificarToken,
  cargarInstitucionesUsuario,
  requirePermission('institucion', 'ver'),
  validateUUIDParam('id'),
  handleValidationErrors,
  obtenerInstitucion,
)
router.get(
  '/:id/estadisticas',
  verificarToken,
  cargarInstitucionesUsuario,
  requirePermission('institucion', 'estadisticas'),
  validateUUIDParam('id'),
  handleValidationErrors,
  obtenerEstadisticasInstitucion,
)
router.post('/', verificarToken, validateInstitucionCrear, handleValidationErrors, crearInstitucion)
router.put(
  '/:id',
  verificarToken,
  cargarInstitucionesUsuario,
  requirePermission('institucion', 'actualizar'),
  validateUUIDParam('id'),
  validateInstitucionActualizar,
  handleValidationErrors,
  actualizarInstitucion,
)
router.patch(
  '/:id/desactivar',
  verificarToken,
  cargarInstitucionesUsuario,
  requirePermission('institucion', 'actualizar'),
  validateUUIDParam('id'),
  handleValidationErrors,
  desactivarInstitucion,
)

module.exports = router

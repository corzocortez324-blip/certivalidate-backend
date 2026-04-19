const express = require('express')
const router = express.Router()

const { verificarToken } = require('../middlewares/auth.middleware')
const {
  listarAuditoria,
  obtenerAuditoriaPorEntidad,
} = require('../controllers/auditoria.controller')
const { requirePermission, cargarInstitucionesUsuario } = require('../utils/authorization')
const { validateUUIDParam, handleValidationErrors } = require('../utils/validators')

router.get('/', verificarToken, cargarInstitucionesUsuario, requirePermission('auditoria', 'ver'), listarAuditoria)
router.get(
  '/:entidad/:entidad_id',
  verificarToken,
  cargarInstitucionesUsuario,
  requirePermission('auditoria', 'ver'),
  validateUUIDParam('entidad_id'),
  handleValidationErrors,
  obtenerAuditoriaPorEntidad,
)

module.exports = router

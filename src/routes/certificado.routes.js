const express = require('express')
const router = express.Router()

const verificarToken = require('../middlewares/auth.middleware')
const {
  emitirCertificado,
  verificarCertificado,
  descargarCertificado,
  listarCertificados,
  obtenerCertificado,
  obtenerVerificaciones,
  obtenerRevocaciones,
  revocarCertificado,
} = require('../controllers/certificado.controller')
const {
  validateCertificado,
  validateRevocacion,
  validateUUIDParam,
  handleValidationErrors,
} = require('../utils/validators')
const { requirePermission } = require('../utils/authorization')

router.post(
  '/emitir',
  verificarToken,
  requirePermission('certificado', 'emitir', {
    institucionIdResolver: (req) => req.body.institucion_id,
  }),
  validateCertificado,
  handleValidationErrors,
  emitirCertificado,
)
router.get(
  '/listar',
  verificarToken,
  requirePermission('certificado', 'listar'),
  listarCertificados,
)
router.get(
  '/descargar/:id',
  verificarToken,
  requirePermission('certificado', 'descargar'),
  validateUUIDParam('id'),
  handleValidationErrors,
  descargarCertificado,
)
router.get(
  '/:id/verificaciones',
  verificarToken,
  requirePermission('certificado', 'ver'),
  validateUUIDParam('id'),
  handleValidationErrors,
  obtenerVerificaciones,
)
router.get(
  '/:id/revocaciones',
  verificarToken,
  requirePermission('certificado', 'ver'),
  validateUUIDParam('id'),
  handleValidationErrors,
  obtenerRevocaciones,
)
router.get(
  '/:id',
  verificarToken,
  requirePermission('certificado', 'ver'),
  validateUUIDParam('id'),
  handleValidationErrors,
  obtenerCertificado,
)
router.post(
  '/:id/revocar',
  verificarToken,
  requirePermission('certificado', 'revocar'),
  validateUUIDParam('id'),
  validateRevocacion,
  handleValidationErrors,
  revocarCertificado,
)

router.post('/verificar', verificarCertificado)

module.exports = router

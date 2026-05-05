const express = require('express')
const router = express.Router()

const { verificarToken, requireEmailVerified } = require('../middlewares/auth.middleware')
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
  validateVerificarCertificado,
  validateUUIDParam,
  handleValidationErrors,
} = require('../utils/validators')
const { requirePermission, cargarInstitucionesUsuario } = require('../utils/authorization')

router.post(
  '/emitir',
  verificarToken,
  requireEmailVerified,
  cargarInstitucionesUsuario,
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
  requireEmailVerified,
  cargarInstitucionesUsuario,
  requirePermission('certificado', 'listar'),
  listarCertificados,
)
router.get(
  '/descargar/:id',
  verificarToken,
  requireEmailVerified,
  cargarInstitucionesUsuario,
  requirePermission('certificado', 'descargar'),
  validateUUIDParam('id'),
  handleValidationErrors,
  descargarCertificado,
)
router.get(
  '/:id/verificaciones',
  verificarToken,
  requireEmailVerified,
  cargarInstitucionesUsuario,
  requirePermission('certificado', 'ver'),
  validateUUIDParam('id'),
  handleValidationErrors,
  obtenerVerificaciones,
)
router.get(
  '/:id/revocaciones',
  verificarToken,
  requireEmailVerified,
  cargarInstitucionesUsuario,
  requirePermission('certificado', 'ver'),
  validateUUIDParam('id'),
  handleValidationErrors,
  obtenerRevocaciones,
)
router.get(
  '/:id',
  verificarToken,
  requireEmailVerified,
  cargarInstitucionesUsuario,
  requirePermission('certificado', 'ver'),
  validateUUIDParam('id'),
  handleValidationErrors,
  obtenerCertificado,
)
router.post(
  '/:id/revocar',
  verificarToken,
  requireEmailVerified,
  cargarInstitucionesUsuario,
  requirePermission('certificado', 'revocar'),
  validateUUIDParam('id'),
  validateRevocacion,
  handleValidationErrors,
  revocarCertificado,
)

router.post('/verificar', validateVerificarCertificado, handleValidationErrors, verificarCertificado)

module.exports = router

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
  handleValidationErrors,
} = require('../utils/validators')

// Rutas protegidas (requieren autenticación)
router.post(
  '/emitir',
  verificarToken,
  validateCertificado,
  handleValidationErrors,
  emitirCertificado,
)
router.get('/listar', verificarToken, listarCertificados)
router.get('/descargar/:id', verificarToken, descargarCertificado)
router.get('/:id/verificaciones', verificarToken, obtenerVerificaciones)
router.get('/:id/revocaciones', verificarToken, obtenerRevocaciones)
router.get('/:id', verificarToken, obtenerCertificado)
router.post('/:id/revocar', verificarToken, revocarCertificado)

// Rutas públicas
router.post('/verificar', verificarCertificado)

module.exports = router

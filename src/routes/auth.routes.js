const express = require('express')
const router = express.Router()

const {
  register,
  login,
  refreshToken,
  logout,
  obtenerPerfil,
  actualizarPerfil,
  cambiarPassword,
  verificarEmail,
} = require('../controllers/auth.controller')
const verificarToken = require('../middlewares/auth.middleware')
const {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateRefreshToken,
  handleValidationErrors,
} = require('../utils/validators')

router.post('/register', validateRegister, handleValidationErrors, register)
router.get('/verificar-email', verificarEmail)
router.post('/login', validateLogin, handleValidationErrors, login)
router.post('/refresh', validateRefreshToken, handleValidationErrors, refreshToken)
router.post('/logout', verificarToken, validateRefreshToken, handleValidationErrors, logout)
router.get('/perfil', verificarToken, obtenerPerfil)
router.put(
  '/perfil',
  verificarToken,
  validateUpdateProfile,
  handleValidationErrors,
  actualizarPerfil,
)
router.put(
  '/perfil/password',
  verificarToken,
  validateChangePassword,
  handleValidationErrors,
  cambiarPassword,
)

module.exports = router

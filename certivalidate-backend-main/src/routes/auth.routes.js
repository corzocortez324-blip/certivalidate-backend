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
  obtenerPermisos,
  establecerPassword,
} = require('../controllers/auth.controller')
const {
  verificarToken,
  requireEmailVerified,
} = require('../middlewares/auth.middleware')
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
router.post('/establecer-password', establecerPassword)
router.post('/login', validateLogin, handleValidationErrors, login)
router.post(
  '/refresh',
  validateRefreshToken,
  handleValidationErrors,
  refreshToken,
)
router.post(
  '/logout',
  verificarToken,
  validateRefreshToken,
  handleValidationErrors,
  logout,
)
router.get('/perfil', verificarToken, obtenerPerfil)
router.get('/permisos', verificarToken, obtenerPermisos)
router.put(
  '/perfil',
  verificarToken,
  requireEmailVerified,
  validateUpdateProfile,
  handleValidationErrors,
  actualizarPerfil,
)
router.put(
  '/perfil/password',
  verificarToken,
  requireEmailVerified,
  validateChangePassword,
  handleValidationErrors,
  cambiarPassword,
)

module.exports = router

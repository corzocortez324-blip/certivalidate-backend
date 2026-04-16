const express = require('express')
const router = express.Router()

const {
  register,
  login,
  refreshToken,
  obtenerPerfil,
  actualizarPerfil,
  cambiarPassword,
} = require('../controllers/auth.controller')
const verificarToken = require('../middlewares/auth.middleware')
const {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  handleValidationErrors,
} = require('../utils/validators')

router.post('/register', validateRegister, handleValidationErrors, register)
router.post('/login', validateLogin, handleValidationErrors, login)
router.post('/refresh', refreshToken)
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
  validateUpdateProfile,
  cambiarPassword,
)

module.exports = router

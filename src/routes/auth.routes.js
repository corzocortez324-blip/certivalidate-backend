const express = require('express');
const router = express.Router();

const { register, login, obtenerPerfil } = require('../controllers/auth.controller');
const verificarToken = require('../middlewares/auth.middleware');
const {
  validateRegister,
  validateLogin,
  handleValidationErrors
} = require('../utils/validators');

router.post('/register', validateRegister, handleValidationErrors, register);
router.post('/login', validateLogin, handleValidationErrors, login);
router.get('/perfil', verificarToken, obtenerPerfil);

module.exports = router;
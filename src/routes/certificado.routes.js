const express = require('express');
const router = express.Router();



const verificarToken = require('../middlewares/auth.middleware');

const {
  emitirCertificado,
  verificarCertificado,
  descargarCertificado
} = require('../controllers/certificado.controller');


// Ruta protegida
router.post('/emitir', verificarToken, emitirCertificado);

// Ruta pública
router.post('/verificar', verificarCertificado);

// Ruta certificados
router.get('/pdf/:id', descargarCertificado);

module.exports = router;
const express = require('express')
const router = express.Router()

const verificarToken = require('../middlewares/auth.middleware')
const {
  listarAuditoria,
  obtenerAuditoriaPorEntidad,
} = require('../controllers/auditoria.controller')

router.get('/', verificarToken, listarAuditoria)
router.get('/:entidad/:entidad_id', verificarToken, obtenerAuditoriaPorEntidad)

module.exports = router

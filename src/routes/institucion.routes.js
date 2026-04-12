const express = require('express')
const router = express.Router()

const verificarToken = require('../middlewares/auth.middleware')
const {
  listarInstituciones,
  obtenerInstitucion,
  crearInstitucion,
  actualizarInstitucion,
} = require('../controllers/institucion.controller')

router.get('/', verificarToken, listarInstituciones)
router.get('/:id', verificarToken, obtenerInstitucion)
router.post('/', verificarToken, crearInstitucion)
router.put('/:id', verificarToken, actualizarInstitucion)

module.exports = router

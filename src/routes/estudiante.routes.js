const express = require('express')
const router = express.Router()

const verificarToken = require('../middlewares/auth.middleware')
const {
  listarEstudiantes,
  obtenerEstudiante,
  crearEstudiante,
  actualizarEstudiante,
  eliminarEstudiante,
} = require('../controllers/estudiante.controller')

router.get('/', verificarToken, listarEstudiantes)
router.get('/:id', verificarToken, obtenerEstudiante)
router.post('/', verificarToken, crearEstudiante)
router.put('/:id', verificarToken, actualizarEstudiante)
router.delete('/:id', verificarToken, eliminarEstudiante)

module.exports = router

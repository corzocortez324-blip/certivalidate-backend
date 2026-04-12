const prisma = require('./prisma')

const obtenerInstitucionesUsuario = async (usuarioId) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { instituciones: true },
  })
  return usuario?.instituciones.map((item) => item.institucion_id) || []
}

module.exports = {
  obtenerInstitucionesUsuario,
}

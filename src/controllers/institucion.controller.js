const { sendSuccess, sendError } = require('../utils/response.utils')
const prisma = require('../utils/prisma')

// Listar instituciones
const listarInstituciones = async (req, res) => {
  try {
    const instituciones = await prisma.institucion.findMany({
      orderBy: { created_at: 'desc' },
    })

    return sendSuccess(
      res,
      instituciones,
      'Instituciones obtenidas correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en listarInstituciones:', error)
    return sendError(res, 'Error al listar instituciones', 500)
  }
}

// Obtener institución por ID con estudiantes y plantillas
const obtenerInstitucion = async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return sendError(res, 'ID de la institución es obligatorio', 400)
    }

    const institucion = await prisma.institucion.findUnique({
      where: { id },
      include: {
        estudiantes: true,
        plantillas: true,
      },
    })

    if (!institucion) {
      return sendError(res, 'Institución no encontrada', 404)
    }

    return sendSuccess(
      res,
      institucion,
      'Institución obtenida correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en obtenerInstitucion:', error)
    return sendError(res, 'Error al obtener institución', 500)
  }
}

// Crear institución
const crearInstitucion = async (req, res) => {
  try {
    const { nombre, dominio, logo_url, activa } = req.body

    if (!nombre) {
      return sendError(res, 'El nombre de la institución es obligatorio', 400)
    }

    const nuevaInstitucion = await prisma.institucion.create({
      data: {
        nombre,
        dominio: dominio || null,
        logo_url: logo_url || null,
        activa: typeof activa === 'boolean' ? activa : true,
      },
    })

    return sendSuccess(
      res,
      nuevaInstitucion,
      'Institución creada correctamente',
      201,
    )
  } catch (error) {
    console.error('Error en crearInstitucion:', error)
    return sendError(res, 'Error al crear institución', 500)
  }
}

// Actualizar institución
const actualizarInstitucion = async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, dominio, logo_url, activa } = req.body

    if (!id) {
      return sendError(res, 'ID de la institución es obligatorio', 400)
    }

    const institucionExistente = await prisma.institucion.findUnique({
      where: { id },
    })

    if (!institucionExistente) {
      return sendError(res, 'Institución no encontrada', 404)
    }

    const institucionActualizada = await prisma.institucion.update({
      where: { id },
      data: {
        nombre: nombre || institucionExistente.nombre,
        dominio: dominio !== undefined ? dominio : institucionExistente.dominio,
        logo_url:
          logo_url !== undefined ? logo_url : institucionExistente.logo_url,
        activa:
          typeof activa === 'boolean' ? activa : institucionExistente.activa,
      },
    })

    return sendSuccess(
      res,
      institucionActualizada,
      'Institución actualizada correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en actualizarInstitucion:', error)
    return sendError(res, 'Error al actualizar institución', 500)
  }
}

module.exports = {
  listarInstituciones,
  obtenerInstitucion,
  crearInstitucion,
  actualizarInstitucion,
}

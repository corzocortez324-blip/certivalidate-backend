const { sendSuccess, sendError } = require('../utils/response.utils')
const prisma = require('../utils/prisma')

// Listar estudiantes con paginación
const listarEstudiantes = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    )
    const usuarioId = req.usuario?.id

    const usuarioConInstituciones = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { instituciones: true },
    })

    const institucionIds =
      usuarioConInstituciones?.instituciones.map(
        (item) => item.institucion_id,
      ) || []

    const where =
      institucionIds.length > 0
        ? { institucion_id: { in: institucionIds } }
        : {}

    const total = await prisma.estudiante.count({ where })

    const estudiantes = await prisma.estudiante.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
    })

    const totalPages = Math.max(Math.ceil(total / limit), 1)

    return sendSuccess(
      res,
      {
        total,
        page,
        limit,
        totalPages,
        estudiantes,
      },
      'Estudiantes obtenidos correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en listarEstudiantes:', error)
    return sendError(res, 'Error al listar estudiantes', 500)
  }
}

// Obtener estudiante por ID
const obtenerEstudiante = async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return sendError(res, 'ID del estudiante es obligatorio', 400)
    }

    const estudiante = await prisma.estudiante.findUnique({
      where: { id },
    })

    if (!estudiante) {
      return sendError(res, 'Estudiante no encontrado', 404)
    }

    return sendSuccess(
      res,
      estudiante,
      'Estudiante obtenido correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en obtenerEstudiante:', error)
    return sendError(res, 'Error al obtener estudiante', 500)
  }
}

// Crear estudiante
const crearEstudiante = async (req, res) => {
  try {
    const { institucion_id, nombre, apellido, documento, email } = req.body

    if (!institucion_id || !nombre || !apellido || !documento) {
      return sendError(
        res,
        'institucion_id, nombre, apellido y documento son obligatorios',
        400,
      )
    }

    const institucion = await prisma.institucion.findUnique({
      where: { id: institucion_id },
    })

    if (!institucion) {
      return sendError(res, 'Institución no encontrada', 404)
    }

    const nuevoEstudiante = await prisma.estudiante.create({
      data: {
        institucion_id,
        nombre,
        apellido,
        documento,
        email: email || null,
      },
    })

    return sendSuccess(
      res,
      nuevoEstudiante,
      'Estudiante creado correctamente',
      201,
    )
  } catch (error) {
    console.error('Error en crearEstudiante:', error)
    return sendError(res, 'Error al crear estudiante', 500)
  }
}

// Actualizar estudiante
const actualizarEstudiante = async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, apellido, documento, email, institucion_id } = req.body

    if (!id) {
      return sendError(res, 'ID del estudiante es obligatorio', 400)
    }

    const estudianteExistente = await prisma.estudiante.findUnique({
      where: { id },
    })

    if (!estudianteExistente) {
      return sendError(res, 'Estudiante no encontrado', 404)
    }

    if (institucion_id) {
      const institucion = await prisma.institucion.findUnique({
        where: { id: institucion_id },
      })

      if (!institucion) {
        return sendError(res, 'Institución no encontrada', 404)
      }
    }

    const estudianteActualizado = await prisma.estudiante.update({
      where: { id },
      data: {
        institucion_id: institucion_id || estudianteExistente.institucion_id,
        nombre: nombre || estudianteExistente.nombre,
        apellido: apellido || estudianteExistente.apellido,
        documento: documento || estudianteExistente.documento,
        email: email || estudianteExistente.email,
      },
    })

    return sendSuccess(
      res,
      estudianteActualizado,
      'Estudiante actualizado correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en actualizarEstudiante:', error)
    return sendError(res, 'Error al actualizar estudiante', 500)
  }
}

// Eliminar estudiante
const eliminarEstudiante = async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return sendError(res, 'ID del estudiante es obligatorio', 400)
    }

    const estudianteExistente = await prisma.estudiante.findUnique({
      where: { id },
    })

    if (!estudianteExistente) {
      return sendError(res, 'Estudiante no encontrado', 404)
    }

    await prisma.estudiante.delete({ where: { id } })

    return sendSuccess(res, null, 'Estudiante eliminado correctamente', 200)
  } catch (error) {
    console.error('Error en eliminarEstudiante:', error)
    return sendError(res, 'Error al eliminar estudiante', 500)
  }
}

module.exports = {
  listarEstudiantes,
  obtenerEstudiante,
  crearEstudiante,
  actualizarEstudiante,
  eliminarEstudiante,
}

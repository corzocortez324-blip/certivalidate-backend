const { sendSuccess, sendError } = require('../utils/response.utils')
const prisma = require('../utils/prisma')

// Listar auditoría con filtros y paginación
const listarAuditoria = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    )
    const { entidad, accion, usuario_id, fecha_desde, fecha_hasta } = req.query

    const where = {}

    if (entidad) {
      where.entidad = entidad
    }

    if (accion) {
      where.accion = accion
    }

    if (usuario_id) {
      where.usuario_id = usuario_id
    }

    if (fecha_desde || fecha_hasta) {
      where.fecha = {}

      if (fecha_desde) {
        where.fecha.gte = new Date(fecha_desde)
      }

      if (fecha_hasta) {
        where.fecha.lte = new Date(fecha_hasta)
      }
    }

    const total = await prisma.auditoria.count({ where })

    const auditorias = await prisma.auditoria.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { fecha: 'desc' },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    })

    const totalPages = Math.max(Math.ceil(total / limit), 1)

    return sendSuccess(
      res,
      {
        total,
        page,
        limit,
        totalPages,
        auditorias,
      },
      'Registros de auditoría obtenidos correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en listarAuditoria:', error)
    return sendError(res, 'Error al listar auditoría', 500)
  }
}

// Obtener historial de auditoría de una entidad específica
const obtenerAuditoriaPorEntidad = async (req, res) => {
  try {
    const { entidad, entidad_id } = req.params

    if (!entidad || !entidad_id) {
      return sendError(res, 'Entidad y entidad_id son obligatorios', 400)
    }

    const auditorias = await prisma.auditoria.findMany({
      where: {
        entidad,
        entidad_id,
      },
      orderBy: { fecha: 'desc' },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    })

    return sendSuccess(
      res,
      auditorias,
      'Historial de auditoría obtenido correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en obtenerAuditoriaPorEntidad:', error)
    return sendError(res, 'Error al obtener historial de auditoría', 500)
  }
}

module.exports = {
  listarAuditoria,
  obtenerAuditoriaPorEntidad,
}

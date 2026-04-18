const { sendSuccess, sendError } = require('../utils/response.utils')
const prisma = require('../utils/prisma')
const logger = require('../utils/logger')

// Límite defensivo: evita traer decenas de miles de IDs a memoria.
// TODO: reemplazar por un campo institucion_id directo en Auditoria cuando se migre el schema.
const ID_FETCH_LIMIT = 5000

const construirFiltroAuditoriaAutorizada = async (usuarioId, institucionIds) => {
  if (institucionIds.length === 0) {
    return null
  }

  const [certificados, estudiantes, plantillas] = await Promise.all([
    prisma.certificado.findMany({
      where: { institucion_id: { in: institucionIds } },
      select: { id: true },
      take: ID_FETCH_LIMIT,
    }),
    prisma.estudiante.findMany({
      where: { institucion_id: { in: institucionIds } },
      select: { id: true },
      take: ID_FETCH_LIMIT,
    }),
    prisma.plantillaCertificado.findMany({
      where: { institucion_id: { in: institucionIds } },
      select: { id: true },
      take: ID_FETCH_LIMIT,
    }),
  ])

  const certIds = certificados.map((item) => item.id)
  const estudianteIds = estudiantes.map((item) => item.id)
  const plantillaIds = plantillas.map((item) => item.id)

  return {
    OR: [
      { entidad: 'Usuario', entidad_id: usuarioId },
      { entidad: 'Institucion', entidad_id: { in: institucionIds } },
      { entidad: 'Certificado', entidad_id: { in: certIds } },
      { entidad: 'Estudiante', entidad_id: { in: estudianteIds } },
      { entidad: 'PlantillaCertificado', entidad_id: { in: plantillaIds } },
      { entidad: 'Plantilla', entidad_id: { in: plantillaIds } },
    ],
  }
}

const listarAuditoria = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    )
    const { entidad, accion, usuario_id, fecha_desde, fecha_hasta } = req.query

    const filtroAutorizado = await construirFiltroAuditoriaAutorizada(
      req.usuario?.id,
      req.institucionIds,
    )

    if (!filtroAutorizado) {
      return sendError(res, 'No autorizado para ver auditoría', 403)
    }

    const where = { AND: [filtroAutorizado] }

    if (entidad) {
      where.AND.push({ entidad })
    }

    if (accion) {
      where.AND.push({ accion })
    }

    if (usuario_id) {
      where.AND.push({ usuario_id })
    }

    if (fecha_desde || fecha_hasta) {
      const fecha = {}
      if (fecha_desde) fecha.gte = new Date(fecha_desde)
      if (fecha_hasta) fecha.lte = new Date(fecha_hasta)
      where.AND.push({ fecha })
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
    logger.error({ err: error, requestId: req.requestId }, 'Error en listarAuditoria')
    return sendError(res, 'Error al listar auditoría', 500)
  }
}

const obtenerAuditoriaPorEntidad = async (req, res) => {
  try {
    const { entidad, entidad_id } = req.params

    if (!entidad || !entidad_id) {
      return sendError(res, 'Entidad y entidad_id son obligatorios', 400)
    }

    const filtroAutorizado = await construirFiltroAuditoriaAutorizada(
      req.usuario?.id,
      req.institucionIds,
    )

    if (!filtroAutorizado) {
      return sendError(res, 'No autorizado para ver auditoría', 403)
    }

    const auditorias = await prisma.auditoria.findMany({
      where: {
        AND: [
          filtroAutorizado,
          {
            entidad,
            entidad_id,
          },
        ],
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
    logger.error({ err: error, requestId: req.requestId }, 'Error en obtenerAuditoriaPorEntidad')
    return sendError(res, 'Error al obtener historial de auditoría', 500)
  }
}

module.exports = {
  listarAuditoria,
  obtenerAuditoriaPorEntidad,
}

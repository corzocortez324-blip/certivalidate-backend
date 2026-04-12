const { sendSuccess, sendError } = require('../utils/response.utils')
const prisma = require('../utils/prisma')
const { obtenerInstitucionesUsuario } = require('../utils/authorization')

// Listar instituciones
const listarInstituciones = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id
    const institucionIds = await obtenerInstitucionesUsuario(usuarioId)

    if (institucionIds.length === 0) {
      return sendError(res, 'No autorizado para ver instituciones', 403)
    }

    const instituciones = await prisma.institucion.findMany({
      where: { id: { in: institucionIds } },
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

    const usuarioId = req.usuario?.id
    const institucionIds = await obtenerInstitucionesUsuario(usuarioId)

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

    if (!institucionIds.includes(id)) {
      return sendError(res, 'No autorizado para ver esta institución', 403)
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

    const usuarioId = req.usuario?.id
    const institucionIds = await obtenerInstitucionesUsuario(usuarioId)

    const institucionExistente = await prisma.institucion.findUnique({
      where: { id },
    })

    if (!institucionExistente) {
      return sendError(res, 'Institución no encontrada', 404)
    }

    if (!institucionIds.includes(id)) {
      return sendError(
        res,
        'No autorizado para actualizar esta institución',
        403,
      )
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

// Desactivar institución
const desactivarInstitucion = async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return sendError(res, 'ID de la institución es obligatorio', 400)
    }

    const usuarioId = req.usuario?.id
    const institucionIds = await obtenerInstitucionesUsuario(usuarioId)

    const institucionExistente = await prisma.institucion.findUnique({
      where: { id },
    })

    if (!institucionExistente) {
      return sendError(res, 'Institución no encontrada', 404)
    }

    if (!institucionIds.includes(id)) {
      return sendError(
        res,
        'No autorizado para desactivar esta institución',
        403,
      )
    }

    if (institucionExistente.activa === false) {
      return sendSuccess(
        res,
        institucionExistente,
        'La institución ya está desactivada',
        200,
      )
    }

    const institucionActualizada = await prisma.institucion.update({
      where: { id },
      data: { activa: false },
    })

    return sendSuccess(
      res,
      institucionActualizada,
      'Institución desactivada correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en desactivarInstitucion:', error)
    return sendError(res, 'Error al desactivar institución', 500)
  }
}

const obtenerEstadisticasInstitucion = async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return sendError(res, 'ID de la institución es obligatorio', 400)
    }

    const usuarioId = req.usuario?.id
    const institucionIds = await obtenerInstitucionesUsuario(usuarioId)

    if (!institucionIds.includes(id)) {
      return sendError(
        res,
        'No autorizado para ver estadísticas de esta institución',
        403,
      )
    }

    const institucion = await prisma.institucion.findUnique({
      where: { id },
    })

    if (!institucion) {
      return sendError(res, 'Institución no encontrada', 404)
    }

    const [
      estudiantesCount,
      plantillasCount,
      certificadosCount,
      certificadosValidosCount,
      certificadosRevocadosCount,
      certificadosExpiradosCount,
      verificacionesCount,
    ] = await Promise.all([
      prisma.estudiante.count({ where: { institucion_id: id } }),
      prisma.plantillaCertificado.count({ where: { institucion_id: id } }),
      prisma.certificado.count({
        where: { institucion_id: id, deleted_at: null },
      }),
      prisma.certificado.count({
        where: {
          institucion_id: id,
          estado: 'válido',
          deleted_at: null,
        },
      }),
      prisma.certificado.count({
        where: {
          institucion_id: id,
          estado: 'revocado',
          deleted_at: null,
        },
      }),
      prisma.certificado.count({
        where: {
          institucion_id: id,
          fecha_expiracion: { lt: new Date() },
          deleted_at: null,
        },
      }),
      prisma.verificacionPublica.count({
        where: {
          certificado: {
            institucion_id: id,
            deleted_at: null,
          },
        },
      }),
    ])

    return sendSuccess(
      res,
      {
        institucion_id: id,
        estudiantes: estudiantesCount,
        plantillas: plantillasCount,
        certificados: certificadosCount,
        certificados_validos: certificadosValidosCount,
        certificados_revocados: certificadosRevocadosCount,
        certificados_expirados: certificadosExpiradosCount,
        verificaciones_publicas: verificacionesCount,
      },
      'Estadísticas de institución obtenidas correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en obtenerEstadisticasInstitucion:', error)
    return sendError(
      res,
      'Error al obtener estadísticas de la institución',
      500,
    )
  }
}

module.exports = {
  listarInstituciones,
  obtenerInstitucion,
  crearInstitucion,
  actualizarInstitucion,
  desactivarInstitucion,
  obtenerEstadisticasInstitucion,
}

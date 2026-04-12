const crypto = require('crypto')
const { sendSuccess, sendError } = require('../utils/response.utils')
const generarPDF = require('../utils/pdf.generator')
const prisma = require('../utils/prisma')
const { registrarAuditoria } = require('../utils/auditoria')

// Crear certificado
const emitirCertificado = async (req, res) => {
  try {
    const { estudiante_id, institucion_id, plantilla_id } = req.body

    if (!estudiante_id || !institucion_id || !plantilla_id) {
      return sendError(
        res,
        'estudiante_id, institucion_id y plantilla_id son obligatorios',
        400,
      )
    }

    const estudiante = await prisma.estudiante.findUnique({
      where: { id: estudiante_id },
    })
    const institucion = await prisma.institucion.findUnique({
      where: { id: institucion_id },
    })
    const plantilla = await prisma.plantillaCertificado.findUnique({
      where: { id: plantilla_id },
    })

    if (!estudiante) {
      return sendError(res, 'Estudiante no encontrado', 404)
    }

    if (!institucion) {
      return sendError(res, 'Institución no encontrada', 404)
    }

    if (!plantilla) {
      return sendError(res, 'Plantilla no encontrada', 404)
    }

    const fechaEmision = new Date()
    const codigo_unico = crypto.randomBytes(8).toString('hex').toUpperCase()
    const contenidoReal = `${estudiante.id}|${estudiante.nombre}|${estudiante.apellido}|${estudiante.email}|${institucion.id}|${institucion.nombre}|${plantilla.id}|${plantilla.nombre}|${codigo_unico}|${fechaEmision.toISOString()}`
    const hash_sha256 = crypto
      .createHash('sha256')
      .update(contenidoReal)
      .digest('hex')

    const certificado = await prisma.certificado.create({
      data: {
        estudiante_id,
        institucion_id,
        plantilla_id,
        codigo_unico,
        estado: 'válido',
        fecha_emision: fechaEmision,
        hash_sha256,
      },
    })

    await registrarAuditoria(
      prisma,
      req.usuario?.id || '',
      'EMITIR_CERTIFICADO',
      'Certificado',
      certificado.id,
      null,
      JSON.stringify({
        estudiante_id,
        institucion_id,
        plantilla_id,
        codigo_unico,
      }),
      req.ip ||
        req.headers['x-forwarded-for'] ||
        req.connection?.remoteAddress ||
        null,
    )

    return sendSuccess(
      res,
      certificado,
      'Certificado generado correctamente',
      201,
    )
  } catch (error) {
    console.error('Error en emitirCertificado:', error)
    return sendError(res, 'Error al generar certificado', 500)
  }
}

// Verificar certificado
const verificarCertificado = async (req, res) => {
  try {
    const { hash, codigo } = req.body

    if (!hash && !codigo) {
      return sendError(
        res,
        'El hash o el codigo del certificado es obligatorio',
        400,
      )
    }

    const cert = await prisma.certificado.findFirst({
      where: hash ? { hash_sha256: hash } : { codigo_unico: codigo },
      include: {
        estudiante: true,
        institucion: true,
        plantilla: true,
      },
    })

    const ip =
      req.ip ||
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      null
    const userAgent = req.headers['user-agent'] || null

    if (!cert) {
      await prisma.verificacionPublica.create({
        data: {
          certificado_id: null,
          ip,
          user_agent: userAgent,
          resultado: 'no_encontrado',
        },
      })

      return sendSuccess(
        res,
        {
          estado: 'no válido',
          mensaje: 'El certificado no fue encontrado o no es válido',
        },
        'Verificación completada',
        200,
      )
    }

    const ahora = new Date()
    const estaExpirado =
      cert.fecha_expiracion && ahora > new Date(cert.fecha_expiracion)
    let resultado = 'valido'
    let mensaje = 'Certificado verificado correctamente'

    if (cert.estado === 'revocado') {
      resultado = 'revocado'
      mensaje = 'El certificado ha sido revocado'
    } else if (estaExpirado) {
      resultado = 'expirado'
      mensaje = 'El certificado ha expirado'
    }

    await prisma.verificacionPublica.create({
      data: {
        certificado_id: cert.id,
        ip,
        user_agent: userAgent,
        resultado,
      },
    })

    return sendSuccess(
      res,
      {
        ...cert,
        estado: resultado === 'valido' ? cert.estado : resultado,
        mensaje,
      },
      'Certificado verificado correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en verificarCertificado:', error)
    return sendError(res, 'Error al verificar certificado', 500)
  }
}

// Descargar certificado como PDF
const descargarCertificado = async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return sendError(res, 'ID del certificado es obligatorio', 400)
    }

    const cert = await prisma.certificado.findFirst({
      where: { id, deleted_at: null },
      include: {
        estudiante: true,
        institucion: true,
        plantilla: true,
      },
    })

    if (!cert) {
      return sendError(res, 'Certificado no encontrado', 404)
    }

    // Nota: El pdf.generator puede necesitar ser adaptado para las nuevas propiedades (ej. cert.estudiante.nombre en vez de cert.estudiante)
    generarPDF(cert, res)
  } catch (error) {
    console.error('Error en descargarCertificado:', error)
    return sendError(res, 'Error al descargar certificado', 500)
  }
}

// Listar certificados
const listarCertificados = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    )
    const estadoFiltro = req.query.estado

    const usuarioConInstituciones = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        instituciones: true,
      },
    })

    const instIds =
      usuarioConInstituciones?.instituciones.map((i) => i.institucion_id) || []

    const baseWhere = {
      deleted_at: null,
      ...(instIds.length > 0 ? { institucion_id: { in: instIds } } : {}),
    }

    let estadoWhere = {}

    if (estadoFiltro === 'revocado') {
      estadoWhere = { estado: 'revocado' }
    } else if (estadoFiltro === 'emitido') {
      estadoWhere = { estado: 'válido' }
    } else if (estadoFiltro === 'expirado') {
      estadoWhere = {
        fecha_expiracion: { lt: new Date() },
      }
    }

    const where = {
      ...baseWhere,
      ...estadoWhere,
    }

    const total = await prisma.certificado.count({ where })

    const certificados = await prisma.certificado.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        estudiante: true,
        plantilla: true,
        institucion: true,
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
        certificados,
      },
      'Certificados obtenidos correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en listarCertificados:', error)
    return sendError(res, 'Error al listar certificados', 500)
  }
}

// Obtener detalles de un certificado específico
const obtenerCertificado = async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return sendError(res, 'ID del certificado es obligatorio', 400)
    }

    const cert = await prisma.certificado.findFirst({
      where: { id, deleted_at: null },
      include: {
        estudiante: true,
        institucion: true,
        plantilla: true,
      },
    })

    if (!cert) {
      return sendError(res, 'Certificado no encontrado', 404)
    }

    return sendSuccess(res, cert, 'Certificado obtenido correctamente', 200)
  } catch (error) {
    console.error('Error en obtenerCertificado:', error)
    return sendError(res, 'Error al obtener certificado', 500)
  }
}

// Revocar certificado
const revocarCertificado = async (req, res) => {
  try {
    const { id } = req.params
    const { motivo_codigo, motivo_detalle } = req.body

    if (!id) {
      return sendError(res, 'ID del certificado es obligatorio', 400)
    }

    if (!motivo_codigo) {
      return sendError(res, 'motivo_codigo es obligatorio', 400)
    }

    const certificado = await prisma.certificado.findFirst({
      where: { id, deleted_at: null },
    })

    if (!certificado) {
      return sendError(res, 'Certificado no encontrado', 404)
    }

    if (certificado.estado === 'revocado') {
      return sendError(res, 'El certificado ya está revocado', 409)
    }

    const certificadoActualizado = await prisma.certificado.update({
      where: { id },
      data: {
        estado: 'revocado',
      },
    })

    await prisma.revocacion.create({
      data: {
        certificado_id: id,
        revocado_por: req.usuario?.id || '',
        motivo_codigo,
        motivo_detalle: motivo_detalle || null,
        fecha_revocacion: new Date(),
      },
    })

    const ip =
      req.ip ||
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      null

    await registrarAuditoria(
      prisma,
      req.usuario?.id || '',
      'REVOCAR_CERTIFICADO',
      'Certificado',
      id,
      JSON.stringify({ estado: certificado.estado }),
      JSON.stringify({ estado: 'revocado' }),
      ip,
    )

    return sendSuccess(
      res,
      certificadoActualizado,
      'Certificado revocado correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en revocarCertificado:', error)
    return sendError(res, 'Error al revocar certificado', 500)
  }
}

module.exports = {
  emitirCertificado,
  verificarCertificado,
  descargarCertificado,
  listarCertificados,
  obtenerCertificado,
  revocarCertificado,
}

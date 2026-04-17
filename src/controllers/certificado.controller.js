const crypto = require('crypto')
const { sendSuccess, sendError } = require('../utils/response.utils')
const generarPDF = require('../utils/pdf.generator')
const prisma = require('../utils/prisma')
const { registrarAuditoria } = require('../utils/auditoria')
const { getClientIp } = require('../utils/validators')

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

    if (estudiante.institucion_id !== institucion_id) {
      return sendError(
        res,
        'El estudiante no pertenece a la institución seleccionada',
        400,
      )
    }

    if (!plantilla) {
      return sendError(res, 'Plantilla no encontrada', 404)
    }

    if (plantilla.institucion_id !== institucion_id) {
      return sendError(
        res,
        'La plantilla no pertenece a la institución seleccionada',
        400,
      )
    }

    const institucionIds = req.institucionIds
    if (!institucionIds.includes(institucion_id)) {
      return sendError(
        res,
        'No autorizado para emitir certificados en esta institución',
        403,
      )
    }

    const fechaEmision = new Date()
    const codigo_unico = crypto.randomBytes(8).toString('hex').toUpperCase()
    const contenidoReal = `${estudiante.id}|${estudiante.nombre}|${estudiante.apellido}|${estudiante.email}|${institucion.id}|${institucion.nombre}|${plantilla.id}|${plantilla.nombre}|${codigo_unico}|${fechaEmision.toISOString()}`
    const hash_sha256 = crypto
      .createHash('sha256')
      .update(contenidoReal)
      .digest('hex')

    const certificado = await prisma.$transaction(async (tx) => {
      const cert = await tx.certificado.create({
        data: {
          estudiante_id,
          institucion_id,
          plantilla_id,
          codigo_unico,
          estado: 'valido',
          fecha_emision: fechaEmision,
          hash_sha256,
        },
      })

      await tx.auditoria.create({
        data: {
          usuario_id: req.usuario?.id || '',
          accion: 'EMITIR_CERTIFICADO',
          entidad: 'Certificado',
          entidad_id: cert.id,
          valores_antes: null,
          valores_despues: JSON.stringify({
            estudiante_id,
            institucion_id,
            plantilla_id,
            codigo_unico,
          }),
          ip: getClientIp(req),
        },
      })

      return cert
    })

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
      where: hash
        ? { hash_sha256: hash, deleted_at: null }
        : { codigo_unico: codigo, deleted_at: null },
      include: {
        estudiante: true,
        institucion: true,
        plantilla: true,
      },
    })

    if (!cert) {
      return sendSuccess(
        res,
        {
          estado: 'no_encontrado',
          mensaje: 'El certificado no fue encontrado',
        },
        'Certificado no encontrado',
        200,
      )
    }

    const ip = getClientIp(req)
    const userAgent = req.headers['user-agent'] || null

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
        codigo_unico: cert.codigo_unico,
        estado: resultado === 'valido' ? cert.estado : resultado,
        mensaje,
        fecha_emision: cert.fecha_emision,
        fecha_expiracion: cert.fecha_expiracion,
        estudiante: {
          nombre: cert.estudiante?.nombre,
          apellido: cert.estudiante?.apellido,
        },
        institucion: {
          nombre: cert.institucion?.nombre,
        },
        plantilla: {
          nombre: cert.plantilla?.nombre,
        },
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

    const institucionIds = req.institucionIds

    if (institucionIds.length === 0) {
      return sendError(
        res,
        'No autorizado para descargar este certificado',
        403,
      )
    }

    if (!institucionIds.includes(cert.institucion_id)) {
      return sendError(
        res,
        'No autorizado para descargar este certificado',
        403,
      )
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
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    )
    const estadoFiltro = req.query.estado

    const instIds = req.institucionIds

    const search = (req.query.search || '').trim()
    const institucionId = req.query.institucion_id
    const estudianteId = req.query.estudiante_id

    if (instIds.length === 0) {
      return sendError(res, 'No autorizado para ver certificados', 403)
    }

    const where = {
      deleted_at: null,
      institucion_id: { in: instIds },
    }

    if (institucionId) {
      if (!instIds.includes(institucionId)) {
        return sendError(
          res,
          'No autorizado para ver certificados de esta institución',
          403,
        )
      }

      where.institucion_id = { in: [institucionId] }
    }

    if (estudianteId) {
      where.estudiante_id = estudianteId
    }

    if (estadoFiltro === 'revocado') {
      where.estado = 'revocado'
    } else if (estadoFiltro === 'emitido') {
      where.estado = 'valido'
    } else if (estadoFiltro === 'expirado') {
      where.fecha_expiracion = { lt: new Date() }
    }

    if (search) {
      where.OR = [
        { codigo_unico: { contains: search, mode: 'insensitive' } },
        { hash_sha256: { contains: search, mode: 'insensitive' } },
        { estudiante: { nombre: { contains: search, mode: 'insensitive' } } },
        { estudiante: { apellido: { contains: search, mode: 'insensitive' } } },
        {
          estudiante: { documento: { contains: search, mode: 'insensitive' } },
        },
        { plantilla: { nombre: { contains: search, mode: 'insensitive' } } },
      ]
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

    const institucionIds = req.institucionIds

    if (institucionIds.length === 0) {
      return sendError(res, 'No autorizado para ver este certificado', 403)
    }

    if (!institucionIds.includes(cert.institucion_id)) {
      return sendError(res, 'No autorizado para ver este certificado', 403)
    }

    return sendSuccess(res, cert, 'Certificado obtenido correctamente', 200)
  } catch (error) {
    console.error('Error en obtenerCertificado:', error)
    return sendError(res, 'Error al obtener certificado', 500)
  }
}

// Obtener verificaciones públicas de un certificado
const obtenerVerificaciones = async (req, res) => {
  try {
    const { id } = req.params
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    )

    if (!id) {
      return sendError(res, 'ID del certificado es obligatorio', 400)
    }

    const certificado = await prisma.certificado.findFirst({
      where: { id, deleted_at: null },
    })

    if (!certificado) {
      return sendError(res, 'Certificado no encontrado', 404)
    }

    const total = await prisma.verificacionPublica.count({
      where: { certificado_id: id },
    })

    const verificaciones = await prisma.verificacionPublica.findMany({
      where: { certificado_id: id },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { fecha: 'desc' },
      select: {
        ip: true,
        user_agent: true,
        resultado: true,
        fecha: true,
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
        verificaciones,
      },
      'Verificaciones públicas obtenidas correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en obtenerVerificaciones:', error)
    return sendError(res, 'Error al obtener verificaciones públicas', 500)
  }
}

// Obtener historial de revocaciones de un certificado
const obtenerRevocaciones = async (req, res) => {
  try {
    const { id } = req.params
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    )

    if (!id) {
      return sendError(res, 'ID del certificado es obligatorio', 400)
    }

    const certificado = await prisma.certificado.findFirst({
      where: { id, deleted_at: null },
    })

    if (!certificado) {
      return sendError(res, 'Certificado no encontrado', 404)
    }

    const institucionIds = req.institucionIds

    if (institucionIds.length === 0) {
      return sendError(
        res,
        'No autorizado para ver las revocaciones de este certificado',
        403,
      )
    }

    if (!institucionIds.includes(certificado.institucion_id)) {
      return sendError(
        res,
        'No autorizado para ver las revocaciones de este certificado',
        403,
      )
    }

    const total = await prisma.revocacion.count({
      where: { certificado_id: id },
    })

    const revocaciones = await prisma.revocacion.findMany({
      where: { certificado_id: id },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { fecha_revocacion: 'desc' },
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
        revocaciones,
      },
      'Historial de revocaciones obtenido correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en obtenerRevocaciones:', error)
    return sendError(res, 'Error al obtener historial de revocaciones', 500)
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

    const institucionIds = req.institucionIds

    if (institucionIds.length === 0) {
      return sendError(res, 'No autorizado para revocar este certificado', 403)
    }

    if (!institucionIds.includes(certificado.institucion_id)) {
      return sendError(res, 'No autorizado para revocar este certificado', 403)
    }

    if (certificado.estado === 'revocado') {
      return sendError(res, 'El certificado ya está revocado', 409)
    }

    const [certificadoActualizado] = await prisma.$transaction([
      prisma.certificado.update({
        where: { id },
        data: {
          estado: 'revocado',
        },
      }),
      prisma.revocacion.create({
        data: {
          certificado_id: id,
          revocado_por: req.usuario?.id || '',
          motivo_codigo,
          motivo_detalle: motivo_detalle || null,
          fecha_revocacion: new Date(),
        },
      }),
    ])

    const ip = getClientIp(req)

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
  obtenerVerificaciones,
  obtenerRevocaciones,
  revocarCertificado,
}

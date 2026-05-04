const bcrypt = require('bcrypt')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { sendSuccess, sendError } = require('../utils/response.utils')
const prisma = require('../utils/prisma')
const { registrarAuditoria } = require('../utils/auditoria')
const { getClientIp } = require('../utils/validators')
const { getEnv } = require('../utils/env')
const logger = require('../utils/logger')
const { enviarEmailVerificacion } = require('../utils/mailer')
const { obtenerAccesosUsuario } = require('../utils/authorization')
const {
  buildAccessToken,
  buildRefreshToken,
  persistRefreshToken,
  verifyStoredRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
} = require('../utils/token.service')

const getUserAgent = (req) => req.headers['user-agent'] || null

const formatUsuario = (usuario) => {
  const {
    password_hash,
    token_verificacion,
    token_verificacion_expira,
    ...datos
  } = usuario
  return datos
}

const register = async (req, res) => {
  try {
    const { nombre, apellido, email, password } = req.body

    if (!nombre || !email || !password) {
      return sendError(res, 'Nombre, email y password son obligatorios', 400)
    }

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email },
    })

    if (usuarioExistente) {
      return sendError(res, 'El email ya está registrado', 409)
    }

    const hash = await bcrypt.hash(password, 12)
    const tokenVerificacion = crypto.randomBytes(32).toString('hex')
    const expira = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        apellido: apellido || '',
        email,
        password_hash: hash,
        token_verificacion: tokenVerificacion,
        token_verificacion_expira: expira,
        email_verificado: false,
      },
    })

    await enviarEmailVerificacion({
      email: nuevoUsuario.email,
      nombre: nuevoUsuario.nombre,
      token: tokenVerificacion,
    })

    await registrarAuditoria(
      prisma,
      nuevoUsuario.id,
      'CREAR_USUARIO',
      'Usuario',
      nuevoUsuario.id,
      null,
      JSON.stringify({ nombre, apellido: apellido || '', email }),
      getClientIp(req),
    )

    return sendSuccess(
      res,
      formatUsuario(nuevoUsuario),
      'Usuario registrado correctamente',
      201,
    )
  } catch (error) {
    logger.error({ err: error, requestId: req.requestId }, 'Error en register')
    return sendError(res, 'Error en el registro', 500)
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return sendError(res, 'Email y password son obligatorios', 400)
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email },
    })

    if (!usuario || usuario.deleted_at) {
      return sendError(res, 'Credenciales inválidas', 401)
    }

    if (usuario.activo === false) {
      return sendError(res, 'Usuario desactivado', 403)
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash)

    if (!passwordValida) {
      return sendError(res, 'Credenciales inválidas', 401)
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimo_acceso: new Date() },
    })

    const token = buildAccessToken(usuario)
    const refreshToken = buildRefreshToken(usuario)

    await persistRefreshToken({
      token: refreshToken,
      usuarioId: usuario.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    })

    const accesos = await obtenerAccesosUsuario(usuario.id)
    const ROL_PRIORIDAD = { admin: 3, editor: 2, lector: 1 }
    const rolPrincipal =
      accesos
        .map((a) => a.rol)
        .sort((a, b) => (ROL_PRIORIDAD[b] || 0) - (ROL_PRIORIDAD[a] || 0))[0] ||
      null

    return sendSuccess(
      res,
      {
        token,
        refreshToken,
        usuario: { ...formatUsuario(usuarioActualizado), rol: rolPrincipal },
        accesos,
      },
      'Login exitoso',
      200,
    )
  } catch (error) {
    logger.error({ err: error, requestId: req.requestId }, 'Error en login')
    return sendError(res, 'Error en el login', 500)
  }
}

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return sendError(res, 'Refresh token es obligatorio', 400)
    }

    let decoded
    try {
      decoded = jwt.verify(refreshToken, getEnv('JWT_REFRESH_SECRET'))
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return sendError(res, 'Refresh token expirado', 401)
      }
      return sendError(res, 'Refresh token inválido', 401)
    }

    const refreshTokenGuardado = await verifyStoredRefreshToken({
      token: refreshToken,
      usuarioId: decoded.id,
    })

    if (!refreshTokenGuardado) {
      return sendError(res, 'Refresh token inválido o revocado', 401)
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
    })

    if (!usuario || usuario.deleted_at) {
      return sendError(res, 'Usuario no encontrado', 404)
    }

    if (!usuario.activo) {
      return sendError(res, 'Usuario desactivado', 403)
    }

    if (!usuario.email_verificado) {
      await prisma.refreshToken.updateMany({
        where: { usuario_id: usuario.id, revoked_at: null },
        data: { revoked_at: new Date() },
      })
      return sendError(res, 'Email no verificado', 403)
    }

    const newToken = buildAccessToken(usuario)
    const newRefreshToken = await rotateRefreshToken({
      currentToken: refreshToken,
      usuario,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    })

    return sendSuccess(
      res,
      { token: newToken, refreshToken: newRefreshToken },
      'Tokens renovados correctamente',
      200,
    )
  } catch (error) {
    logger.error(
      { err: error, requestId: req.requestId },
      'Error en refreshToken',
    )
    return sendError(res, 'Error al renovar token', 500)
  }
}

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return sendError(res, 'Refresh token es obligatorio', 400)
    }

    await revokeRefreshToken({
      token: refreshToken,
      usuarioId: req.usuario?.id || null,
    })

    return sendSuccess(res, null, 'Sesión cerrada correctamente', 200)
  } catch (error) {
    logger.error({ err: error, requestId: req.requestId }, 'Error en logout')
    return sendError(res, 'Error al cerrar sesión', 500)
  }
}

const actualizarPerfil = async (req, res) => {
  try {
    const usuarioId = req.usuario.id
    const { nombre, apellido, email } = req.body

    if (!nombre && !apellido && !email) {
      return sendError(
        res,
        'Al menos un campo (nombre, apellido o email) es obligatorio',
        400,
      )
    }

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    })

    if (!usuarioExistente) {
      return sendError(res, 'Usuario no encontrado', 404)
    }

    if (email && email !== usuarioExistente.email) {
      const usuarioEmail = await prisma.usuario.findUnique({
        where: { email },
      })
      if (usuarioEmail) {
        return sendError(res, 'El email ya está en uso', 409)
      }
    }

    const valoresAntes = JSON.stringify({
      nombre: usuarioExistente.nombre,
      apellido: usuarioExistente.apellido,
      email: usuarioExistente.email,
    })

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        nombre: nombre || usuarioExistente.nombre,
        apellido: apellido !== undefined ? apellido : usuarioExistente.apellido,
        email: email || usuarioExistente.email,
        updated_at: new Date(),
      },
    })

    await registrarAuditoria(
      prisma,
      usuarioId,
      'ACTUALIZAR_PERFIL',
      'Usuario',
      usuarioId,
      valoresAntes,
      JSON.stringify({
        nombre: usuarioActualizado.nombre,
        apellido: usuarioActualizado.apellido,
        email: usuarioActualizado.email,
      }),
      getClientIp(req),
    )

    return sendSuccess(
      res,
      formatUsuario(usuarioActualizado),
      'Perfil actualizado correctamente',
      200,
    )
  } catch (error) {
    logger.error(
      { err: error, requestId: req.requestId },
      'Error en actualizarPerfil',
    )
    return sendError(res, 'Error al actualizar perfil', 500)
  }
}

const cambiarPassword = async (req, res) => {
  try {
    const usuarioId = req.usuario.id
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Contraseña actual y nueva son obligatorias', 400)
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    })

    if (!usuario) {
      return sendError(res, 'Usuario no encontrado', 404)
    }

    const passwordValida = await bcrypt.compare(
      currentPassword,
      usuario.password_hash,
    )

    if (!passwordValida) {
      return sendError(res, 'Contraseña actual incorrecta', 401)
    }

    const nuevoHash = await bcrypt.hash(newPassword, 10)

    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        password_hash: nuevoHash,
        must_change_password: false,
        updated_at: new Date(),
      },
    })

    await revokeAllUserRefreshTokens(usuarioId)

    await registrarAuditoria(
      prisma,
      usuarioId,
      'CAMBIAR_PASSWORD',
      'Usuario',
      usuarioId,
      null,
      null,
      getClientIp(req),
    )

    return sendSuccess(
      res,
      null,
      'Contraseña actualizada correctamente. Vuelve a iniciar sesión.',
      200,
    )
  } catch (error) {
    logger.error(
      { err: error, requestId: req.requestId },
      'Error en cambiarPassword',
    )
    return sendError(res, 'Error al cambiar contraseña', 500)
  }
}

const obtenerPerfil = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
    })

    if (!usuario) {
      return sendError(res, 'Usuario no encontrado', 404)
    }

    const accesos = await obtenerAccesosUsuario(usuario.id)
    const ROL_PRIORIDAD = { admin: 3, editor: 2, lector: 1 }
    const rolPrincipal =
      accesos
        .map((a) => a.rol)
        .sort((a, b) => (ROL_PRIORIDAD[b] || 0) - (ROL_PRIORIDAD[a] || 0))[0] ||
      null

    return sendSuccess(
      res,
      { ...formatUsuario(usuario), rol: rolPrincipal },
      'Perfil obtenido correctamente',
      200,
    )
  } catch (error) {
    logger.error(
      { err: error, requestId: req.requestId },
      'Error en obtenerPerfil',
    )
    return sendError(res, 'Error al obtener perfil', 500)
  }
}

const verificarEmail = async (req, res) => {
  try {
    const { token } = req.query
    if (!token) return sendError(res, 'Token de verificación requerido', 400)

    const usuario = await prisma.usuario.findFirst({
      where: {
        token_verificacion: token,
        token_verificacion_expira: { gt: new Date() },
        email_verificado: false,
      },
    })

    if (!usuario) {
      return sendError(res, 'Token de verificación inválido o expirado', 400)
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        email_verificado: true,
        token_verificacion: null,
        token_verificacion_expira: null,
      },
    })

    return sendSuccess(res, null, 'Email verificado correctamente', 200)
  } catch (error) {
    logger.error(
      { err: error, requestId: req.requestId },
      'Error en verificarEmail',
    )
    return sendError(res, 'Error al verificar email', 500)
  }
}

const obtenerPermisos = async (req, res) => {
  try {
    const accesos = await obtenerAccesosUsuario(req.usuario.id)
    return sendSuccess(res, { accesos }, 'Accesos obtenidos correctamente', 200)
  } catch (error) {
    logger.error(
      { err: error, requestId: req.requestId },
      'Error en obtenerPermisos',
    )
    return sendError(res, 'Error al obtener permisos', 500)
  }
}

const establecerPassword = async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return sendError(res, 'Token y password son obligatorios', 400)
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const usuario = await prisma.usuario.findUnique({
      where: { setup_token: tokenHash },
      select: {
        id: true,
        setup_token_expires: true,
        email_verificado: true,
        activo: true,
        deleted_at: true,
      },
    })

    if (!usuario || usuario.deleted_at || !usuario.activo) {
      return sendError(res, 'Token inválido o usuario inactivo', 400)
    }

    if (
      !usuario.setup_token_expires ||
      usuario.setup_token_expires < new Date()
    ) {
      return sendError(res, 'Token expirado', 400)
    }

    const hash = await bcrypt.hash(password, 12)

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        password_hash: hash,
        setup_token: null,
        setup_token_expires: null,
        updated_at: new Date(),
      },
    })

    return sendSuccess(res, null, 'Contraseña establecida correctamente', 200)
  } catch (error) {
    logger.error(
      { err: error, requestId: req.requestId },
      'Error en establecerPassword',
    )
    return sendError(res, 'Error al establecer contraseña', 500)
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  obtenerPerfil,
  actualizarPerfil,
  cambiarPassword,
  verificarEmail,
  obtenerPermisos,
  establecerPassword,
}

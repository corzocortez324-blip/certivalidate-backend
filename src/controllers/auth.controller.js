const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { sendSuccess, sendError } = require('../utils/response.utils')
const prisma = require('../utils/prisma')
const { registrarAuditoria } = require('../utils/auditoria')
const { getClientIp } = require('../utils/validators')
const { getEnv } = require('../utils/env')
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

    const hash = await bcrypt.hash(password, 10)

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        apellido: apellido || '',
        email,
        password_hash: hash,
      },
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

    const { password_hash: _, ...usuarioSinPassword } = nuevoUsuario

    return sendSuccess(
      res,
      usuarioSinPassword,
      'Usuario registrado correctamente',
      201,
    )
  } catch (error) {
    console.error('Error en register:', error)
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

    getEnv('JWT_SECRET')
    getEnv('JWT_REFRESH_SECRET')

    await prisma.usuario.update({
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

    return sendSuccess(
      res,
      {
        token,
        refreshToken,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
        },
      },
      'Login exitoso',
      200,
    )
  } catch (error) {
    console.error('Error en login:', error)
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
    console.error('Error en refreshToken:', error)
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
    console.error('Error en logout:', error)
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

    const { password_hash: _, ...usuarioSinPassword } = usuarioActualizado

    return sendSuccess(
      res,
      usuarioSinPassword,
      'Perfil actualizado correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en actualizarPerfil:', error)
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
    console.error('Error en cambiarPassword:', error)
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

    const { password_hash: _, ...usuarioSinPassword } = usuario

    return sendSuccess(
      res,
      usuarioSinPassword,
      'Perfil obtenido correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en obtenerPerfil:', error)
    return sendError(res, 'Error al obtener perfil', 500)
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
}

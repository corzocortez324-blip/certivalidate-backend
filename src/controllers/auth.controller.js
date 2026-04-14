const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { sendSuccess, sendError } = require('../utils/response.utils')
const prisma = require('../utils/prisma')
const { registrarAuditoria } = require('../utils/auditoria')

// REGISTER
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
        rol: 'usuario',
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
      req.ip ||
        req.headers['x-forwarded-for'] ||
        req.connection?.remoteAddress ||
        null,
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

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return sendError(res, 'Email y password son obligatorios', 400)
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email },
    })

    if (!usuario) {
      return sendError(res, 'Credenciales inválidas', 401)
    }

    if (usuario.activo === false) {
      return sendError(res, 'Usuario desactivado', 403)
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash)

    if (!passwordValida) {
      return sendError(res, 'Credenciales inválidas', 401)
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimo_acceso: new Date() },
    })

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets no están configurados')
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
    )

    const refreshToken = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol, // 👈 también aquí
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
    )

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

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return sendError(res, 'Refresh token es obligatorio', 400)
    }

    let decoded
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return sendError(res, 'Refresh token expirado', 401)
      }
      return sendError(res, 'Refresh token inválido', 401)
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
    })

    if (!usuario) {
      return sendError(res, 'Usuario no encontrado', 404)
    }

    const newToken = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol, // 👈 IMPORTANTE
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
    )

    return sendSuccess(
      res,
      { token: newToken },
      'Access token renovado correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en refreshToken:', error)
    return sendError(res, 'Error al renovar token', 500)
  }
}

// Obtener perfil del usuario autenticado
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
      req.ip ||
        req.headers['x-forwarded-for'] ||
        req.connection?.remoteAddress ||
        null,
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

    await registrarAuditoria(
      prisma,
      usuarioId,
      'CAMBIAR_PASSWORD',
      'Usuario',
      usuarioId,
      null,
      null,
      req.ip ||
        req.headers['x-forwarded-for'] ||
        req.connection?.remoteAddress ||
        null,
    )

    return sendSuccess(res, null, 'Contraseña actualizada correctamente', 200)
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
  obtenerPerfil,
  actualizarPerfil,
  cambiarPassword,
}

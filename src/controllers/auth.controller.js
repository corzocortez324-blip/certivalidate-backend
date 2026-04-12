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
        apellido: apellido || '', // Por ahora lo dejamos vacío si no lo envían
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

    const passwordValida = await bcrypt.compare(password, usuario.password_hash)

    if (!passwordValida) {
      return sendError(res, 'Credenciales inválidas', 401)
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimo_acceso: new Date() },
    })

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nombre: usuario.nombre },
      process.env.JWT_SECRET || 'secreto123',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
    )

    const refreshToken = jwt.sign(
      { id: usuario.id, email: usuario.email, nombre: usuario.nombre },
      process.env.JWT_REFRESH_SECRET || 'refreshsecreto123',
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
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'refreshsecreto123',
      )
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
      { id: usuario.id, email: usuario.email, nombre: usuario.nombre },
      process.env.JWT_SECRET || 'secreto123',
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

module.exports = { register, login, refreshToken, obtenerPerfil }

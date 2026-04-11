const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { sendSuccess, sendError } = require('../utils/response.utils')
const prisma = require('../utils/prisma')

// REGISTER
const register = async (req, res) => {
  try {
    const { nombre, apellido, email, password } = req.body

    if (!nombre || !email || !password) {
      return sendError(res, 'Nombre, email y password son obligatorios', 400)
    }

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email }
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
      }
    })

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
      where: { email }
    })

    if (!usuario) {
      return sendError(res, 'Credenciales inválidas', 401)
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash)

    if (!passwordValida) {
      return sendError(res, 'Credenciales inválidas', 401)
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nombre: usuario.nombre },
      process.env.JWT_SECRET || 'secreto123',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
    )

    return sendSuccess(
      res,
      {
        token,
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

// Obtener perfil del usuario autenticado
const obtenerPerfil = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id }
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

module.exports = { register, login, obtenerPerfil }

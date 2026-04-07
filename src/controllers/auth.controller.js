const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { sendSuccess, sendError } = require('../utils/response.utils')

// Base de datos temporal
let usuarios = []

// REGISTER
const register = async (req, res) => {
  try {
    const { nombre, email, password } = req.body

    // Verificar si el usuario ya existe
    const usuarioExistente = usuarios.find((u) => u.email === email)
    if (usuarioExistente) {
      return sendError(res, 'El email ya está registrado', 409)
    }

    // Hashear contraseña
    const hash = await bcrypt.hash(password, 10)

    const nuevoUsuario = {
      id: usuarios.length + 1,
      nombre,
      email,
      password: hash,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    usuarios.push(nuevoUsuario)

    // No retornar contraseña
    const { password: _, ...usuarioSinPassword } = nuevoUsuario

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

    const usuario = usuarios.find((u) => u.email === email)

    if (!usuario) {
      return sendError(res, 'Credenciales inválidas', 401)
    }

    const passwordValida = await bcrypt.compare(password, usuario.password)

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
const obtenerPerfil = (req, res) => {
  try {
    const usuario = usuarios.find((u) => u.id === req.usuario.id)

    if (!usuario) {
      return sendError(res, 'Usuario no encontrado', 404)
    }

    const { password: _, ...usuarioSinPassword } = usuario

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

module.exports = { register, login, obtenerPerfil }

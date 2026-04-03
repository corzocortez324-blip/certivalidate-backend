const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Base de datos temporal
let usuarios = [];

// REGISTER
const register = async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({
      error: 'Todos los campos son obligatorios'
    });
  }

  const hash = await bcrypt.hash(password, 10);

  const nuevoUsuario = {
    id: usuarios.length + 1,
    nombre,
    email,
    password: hash
  };

  usuarios.push(nuevoUsuario);

  res.json({
    mensaje: 'Usuario creado correctamente',
    usuario: nuevoUsuario
  });
};

// LOGIN
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email y password son obligatorios'
    });
  }

  const usuario = usuarios.find(u => u.email === email);

  if (!usuario) {
    return res.status(404).json({
      error: 'Usuario no existe'
    });
  }

  const valid = await bcrypt.compare(password, usuario.password);

  if (!valid) {
    return res.status(401).json({
      error: 'Contraseña incorrecta'
    });
  }

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email },
    'secreto123',
    { expiresIn: '1h' }
  );

  res.json({
    mensaje: 'Login exitoso',
    token
  });
};

module.exports = { register, login };
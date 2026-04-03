const express = require('express');

const app = express();

// Middleware global
app.use(express.json());

// Rutas
const authRoutes = require('./routes/auth.routes');
const certificadoRoutes = require('./routes/certificado.routes');

app.use('/api/auth', authRoutes);
app.use('/api/certificados', certificadoRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API CertiValidate funcionando 🚀');
});

// Servidor
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});
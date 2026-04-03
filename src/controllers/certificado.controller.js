const crypto = require('crypto');
const generarPDF = require('../utils/pdf.generator');

// Base de datos temporal
let certificados = [];

// Crear certificado
const emitirCertificado = (req, res) => {
  const { estudiante, curso } = req.body;

  if (!estudiante || !curso) {
    return res.status(400).json({
      error: 'Datos incompletos'
    });
  }

  // Generar hash único
  const contenido = `${estudiante}-${curso}-${Date.now()}`;

  const hash = crypto
    .createHash('sha256')
    .update(contenido)
    .digest('hex');

  const certificado = {
    id: certificados.length + 1,
    estudiante,
    curso,
    hash,
    fecha: new Date()
  };

  certificados.push(certificado);

  res.json({
    mensaje: 'Certificado generado ',
    certificado
  });
};

// Verificar certificado
const verificarCertificado = (req, res) => {
  const { hash } = req.body;

  const cert = certificados.find(c => c.hash === hash);

  if (!cert) {
    return res.json({
      estado: 'No válido '
    });
  }

  res.json({
    estado: 'Válido ',
    certificado: cert
  });
};

const descargarCertificado = (req, res) => {
  const { id } = req.params;

  const cert = certificados.find(c => c.id == id);

  if (!cert) {
    return res.status(404).json({
      error: 'Certificado no encontrado'
    });
  }

  generarPDF(cert, res);
};

module.exports = { emitirCertificado, verificarCertificado, descargarCertificado };
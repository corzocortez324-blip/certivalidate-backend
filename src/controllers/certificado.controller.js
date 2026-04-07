const crypto = require('crypto');
const { sendSuccess, sendError } = require('../utils/response.utils');
const generarPDF = require('../utils/pdf.generator');

// Base de datos temporal
let certificados = [];

// Crear certificado
const emitirCertificado = (req, res) => {
  try {
    const { estudiante, curso } = req.body;
    const usuarioId = req.usuario?.id;

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
      usuarioId,
      estado: 'válido',
      fechaEmision: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    certificados.push(certificado);

    return sendSuccess(
      res,
      certificado,
      'Certificado generado correctamente',
      201
    );
  } catch (error) {
    console.error('Error en emitirCertificado:', error);
    return sendError(res, 'Error al generar certificado', 500);
  }
};

// Verificar certificado
const verificarCertificado = (req, res) => {
  try {
    const { hash } = req.body;

    if (!hash) {
      return sendError(res, 'El hash del certificado es obligatorio', 400);
    }

    const cert = certificados.find(c => c.hash === hash);

    if (!cert) {
      return sendSuccess(
        res,
        { 
          estado: 'no válido',
          mensaje: 'El certificado no fue encontrado o no es válido'
        },
        'Verificación completada',
        200
      );
    }

    return sendSuccess(
      res,
      {
        ...cert,
        estado: 'válido',
        mensaje: 'Certificado verificado correctamente'
      },
      'Certificado válido',
      200
    );
  } catch (error) {
    console.error('Error en verificarCertificado:', error);
    return sendError(res, 'Error al verificar certificado', 500);
  }
};

// Descargar certificado como PDF
const descargarCertificado = (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 'ID del certificado es obligatorio', 400);
    }

    const cert = certificados.find(c => c.id == id);

    if (!cert) {
      return sendError(res, 'Certificado no encontrado', 404);
    }

    generarPDF(cert, res);
  } catch (error) {
    console.error('Error en descargarCertificado:', error);
    return sendError(res, 'Error al descargar certificado', 500);
  }
};

// Listar certificados (solo para usuarios autenticados)
const listarCertificados = (req, res) => {
  try {
    const usuarioId = req.usuario?.id;
    
    // Si es admin/moderador podría listar todos, por ahora filtra por usuario
    const certificadosUsuario = certificados.filter(c => c.usuarioId === usuarioId);

    return sendSuccess(
      res,
      {
        total: certificadosUsuario.length,
        certificados: certificadosUsuario
      },
      'Certificados obtenidos correctamente',
      200
    );
  } catch (error) {
    console.error('Error en listarCertificados:', error);
    return sendError(res, 'Error al listar certificados', 500);
  }
};

// Obtener detalles de un certificado específico
const obtenerCertificado = (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario?.id;

    if (!id) {
      return sendError(res, 'ID del certificado es obligatorio', 400);
    }

    const cert = certificados.find(c => c.id == id);

    if (!cert) {
      return sendError(res, 'Certificado no encontrado', 404);
    }

    // Verificar que el usuario pueda acceder a este certificado
    if (cert.usuarioId !== usuarioId) {
      return sendError(res, 'No autorizado para acceder a este certificado', 403);
    }

    return sendSuccess(
      res,
      cert,
      'Certificado obtenido correctamente',
      200
    );
  } catch (error) {
    console.error('Error en obtenerCertificado:', error);
    return sendError(res, 'Error al obtener certificado', 500);
  }
};

module.exports = {
  emitirCertificado,
  verificarCertificado,
  descargarCertificado,
  listarCertificados,
  obtenerCertificado
};
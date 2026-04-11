const crypto = require('crypto');
const { sendSuccess, sendError } = require('../utils/response.utils');
const generarPDF = require('../utils/pdf.generator');
const prisma = require('../utils/prisma');

// Crear certificado
const emitirCertificado = async (req, res) => {
  try {
    const { estudiante_id, institucion_id, plantilla_id } = req.body;
    
    if (!estudiante_id || !institucion_id || !plantilla_id) {
       return sendError(res, 'estudiante_id, institucion_id y plantilla_id son obligatorios', 400);
    }

    const contenido = `${estudiante_id}-${institucion_id}-${Date.now()}`;
    const hash = crypto
      .createHash('sha256')
      .update(contenido)
      .digest('hex');

    const codigo_unico = crypto.randomBytes(8).toString('hex').toUpperCase();

    const certificado = await prisma.certificado.create({
      data: {
        estudiante_id,
        institucion_id,
        plantilla_id,
        codigo_unico,
        estado: 'válido',
        fecha_emision: new Date(),
        hash_sha256: hash
      }
    });

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
const verificarCertificado = async (req, res) => {
  try {
    const { hash, codigo } = req.body; 

    if (!hash && !codigo) {
      return sendError(res, 'El hash o el codigo del certificado es obligatorio', 400);
    }

    const cert = await prisma.certificado.findFirst({
      where: hash ? { hash_sha256: hash } : { codigo_unico: codigo },
      include: {
        estudiante: true,
        institucion: true,
        plantilla: true
      }
    });

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
        estado: cert.estado,
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
const descargarCertificado = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 'ID del certificado es obligatorio', 400);
    }

    const cert = await prisma.certificado.findUnique({
      where: { id },
      include: {
        estudiante: true,
        institucion: true,
        plantilla: true
      }
    });

    if (!cert) {
      return sendError(res, 'Certificado no encontrado', 404);
    }

    // Nota: El pdf.generator puede necesitar ser adaptado para las nuevas propiedades (ej. cert.estudiante.nombre en vez de cert.estudiante)
    generarPDF(cert, res);
  } catch (error) {
    console.error('Error en descargarCertificado:', error);
    return sendError(res, 'Error al descargar certificado', 500);
  }
};

// Listar certificados
const listarCertificados = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id;
    
    // Buscar instituciones donde este usuario tiene acceso
    const usuarioConInstituciones = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        instituciones: true
      }
    });

    const instIds = usuarioConInstituciones?.instituciones.map(i => i.institucion_id) || [];

    const certificados = await prisma.certificado.findMany({
      where: instIds.length > 0 ? { institucion_id: { in: instIds } } : {},
      include: {
        estudiante: true,
        plantilla: true,
        institucion: true
      }
    });

    return sendSuccess(
      res,
      {
        total: certificados.length,
        certificados
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
const obtenerCertificado = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 'ID del certificado es obligatorio', 400);
    }

    const cert = await prisma.certificado.findUnique({
      where: { id },
      include: {
        estudiante: true,
        institucion: true,
        plantilla: true
      }
    });

    if (!cert) {
      return sendError(res, 'Certificado no encontrado', 404);
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
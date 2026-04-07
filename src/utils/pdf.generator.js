const PDFDocument = require('pdfkit')

/**
 * Genera un PDF de certificado
 * @param {Object} certificado - Datos del certificado
 * @param {Object} res - Objeto de respuesta Express
 */
const generarPDF = (certificado, res) => {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    })

    // Headers para descarga
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=certificado_${certificado.id}_${certificado.estudiante.replace(/\s+/g, '_')}.pdf`,
    )

    doc.pipe(res)

    // CONTENIDO DEL PDF
    // Título
    doc
      .fontSize(32)
      .font('Helvetica-Bold')
      .text('CERTIFICADO', { align: 'center' })

    doc.moveDown(0.5)
    doc.fontSize(12).font('Helvetica').text('─'.repeat(80), { align: 'center' })

    doc.moveDown(1)

    // Contenido del certificado
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Se certifica que:', { indent: 50 })

    doc.moveDown(0.5)
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(certificado.estudiante.toUpperCase(), { align: 'center' })

    doc.moveDown(1)
    doc
      .fontSize(12)
      .font('Helvetica')
      .text('Ha completado satisfactoriamente el curso:', { indent: 50 })

    doc.moveDown(0.5)
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(certificado.curso.toUpperCase(), { align: 'center' })

    doc.moveDown(1.5)

    // Fecha
    const fecha = new Date(certificado.fechaEmision)
    const fechaFormato = fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Fecha de emisión: ${fechaFormato}`, { indent: 50 })

    doc.moveDown(1)

    // Hash para verificación
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Código de verificación: ${certificado.hash.substring(0, 16)}...`, {
        indent: 50,
      })

    doc.moveDown(2)
    doc
      .fontSize(9)
      .font('Helvetica-Oblique')
      .text(
        'Este certificado se puede verificar en el sistema CertiValidate utilizando el código de verificación.',
        { align: 'center', width: 500 },
      )

    // Footer
    doc.moveDown(2)
    doc.fontSize(8).font('Helvetica').text('─'.repeat(80), { align: 'center' })
    doc
      .fontSize(8)
      .text('CertiValidate © 2024 - Sistema de Validación de Certificados', {
        align: 'center',
      })

    doc.end()
  } catch (error) {
    console.error('Error generando PDF:', error)
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Error al generar el PDF',
    })
  }
}

module.exports = generarPDF

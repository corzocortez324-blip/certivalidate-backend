const PDFDocument = require('pdfkit');

// 📄 Función para crear PDF
const generarPDF = (certificado, res) => {
  const doc = new PDFDocument();

  // 🔥 Headers para descarga
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=certificado_${certificado.id}.pdf`
  );

  doc.pipe(res);

  // 🧾 CONTENIDO DEL PDF
  doc.fontSize(25).text('Certificado', { align: 'center' });

  doc.moveDown();

  doc.fontSize(16).text(`Estudiante: ${certificado.estudiante}`);
  doc.text(`Curso: ${certificado.curso}`);
  doc.text(`Fecha: ${certificado.fecha}`);
  
  doc.moveDown();

  doc.fontSize(10).text(`Hash: ${certificado.hash}`);

  doc.end();
};

module.exports = generarPDF;
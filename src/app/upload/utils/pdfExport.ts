import jsPDF from 'jspdf';
import { AnalysisResult } from '../components/Download'; // Adjust path if needed

// Replace with your Vision logo URL or local path
const VISION_LOGO_URL = '/vision-logo.png'; // Place your logo in public folder

// Export a single analysis as PDF with logo and watermark
export const exportAnalysisAsPDF = async (result: AnalysisResult) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- Header with Logo ---
  const logo = new Image();
  logo.src = VISION_LOGO_URL;

  await new Promise<void>((resolve) => {
    logo.onload = () => {
      const logoWidth = 30;
      const logoHeight = (logo.height / logo.width) * logoWidth;
      doc.addImage(logo, 'PNG', 15, 5, logoWidth, logoHeight);

      // Header title
      doc.setFontSize(16);
      doc.setTextColor(22, 163, 74);
      doc.text('Vision AI - Analysis Report', pageWidth / 2, 15, { align: 'center' });
      resolve();
    };
    logo.onerror = () => resolve();
  });

  // --- File Info ---
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`File: ${result.filename}`, 15, 30);
  doc.text(`Type: ${result.type.toUpperCase()}`, 15, 38);
  doc.text(`Date: ${new Date(result.timestamp).toLocaleString()}`, 15, 46);

  // --- Preview ---
  if (result.preview && result.type === 'image') {
    const img = new Image();
    img.src = result.preview;
    await new Promise<void>((resolve) => {
      img.onload = () => {
        const ratio = img.width / img.height;
        const imgWidth = pageWidth - 30;
        const imgHeight = imgWidth / ratio;
        doc.addImage(img, 'JPEG', 15, 55, imgWidth, imgHeight);
        resolve();
      };
      img.onerror = () => resolve();
    });
  }

  // --- Analysis Text ---
  const yOffset = result.preview && result.type === 'image' ? 55 + 90 : 55;
  const lines = doc.splitTextToSize(result.analysis, pageWidth - 30);
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text(lines, 15, yOffset + 10);

  // --- Watermark ---
  doc.setFontSize(50);
  doc.setTextColor(22, 163, 74, 30); // light green, transparent
  doc.setRotation(45, { origin: [pageWidth / 2, pageHeight / 2] });
  doc.text('VISION AI', pageWidth / 2, pageHeight / 2, { align: 'center' });
  doc.setRotation(0);

  // --- Save PDF ---
  doc.save(`${result.filename.replace(/\s+/g, '_')}.pdf`);
};

// Export all analyses as one PDF
export const exportAllAnalysesAsPDF = async (results: AnalysisResult[]) => {
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    await exportAnalysisAsPDF(result);
    if (i < results.length - 1) {
      // Add a page break for multiple files
      const doc = new jsPDF();
      doc.addPage();
    }
  }
};

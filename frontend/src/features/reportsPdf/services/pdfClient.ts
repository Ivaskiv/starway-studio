// frontend/src/features/reportsPdf/services/pdfClient.ts

import { PDFDocument } from 'pdf-lib';

/**
 * 📄 Завантажити PDF з URL
 */
export const loadPdfFromUrl = async (url: string): Promise<PDFDocument> => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer);
  return doc;
};

/**
 * 📄 Створити порожній PDF
 */
export const createEmptyPdf = async (): Promise<PDFDocument> => {
  const doc = await PDFDocument.create();
  return doc;
};

/**
 * 💾 Зберегти PDF у байти
 */
export const savePdf = async (doc: PDFDocument): Promise<Uint8Array> => {
  const bytes = await doc.save();
  return bytes;
};

/**
 * 📥 Зберегти PDF у Blob
 */
export const savePdfAsBlob = async (doc: PDFDocument): Promise<Blob> => {
  const bytes = await doc.save();
  return new Blob([bytes], { type: 'application/pdf' });
};
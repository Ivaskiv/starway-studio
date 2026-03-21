// frontend/src/features/reportsPdf/services/pdfClient.ts
import { PDFDocument } from 'pdf-lib'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'

async function getPdfMake() {
  const pdfMakeModule = await import('pdfmake/build/pdfmake')
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts')
  const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule
  const vfs = (pdfFontsModule as any).default?.vfs ?? (pdfFontsModule as any).vfs ?? {}
  pdfMake.vfs = vfs
  return pdfMake as {
    createPdf(docDefinition: TDocumentDefinitions): {
      getBlob: (cb: (blob: Blob) => void) => void
    }
  }
}

export const getPdfAsBlob = async (docDefinition: TDocumentDefinitions): Promise<Blob> => {
  const pdfMake = await getPdfMake()
  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBlob(blob => resolve(blob))
    } catch (err) {
      reject(err)
    }
  })
}

export async function loadPdfFromUrl(url: string): Promise<PDFDocument> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load PDF template: ${res.status} ${res.statusText}`)
  }
  const bytes = await res.arrayBuffer()
  return PDFDocument.load(bytes)
}

export const savePdfAsBlob = async (doc: PDFDocument): Promise<Blob> => {
  const bytes = await doc.save()
  const normalized = new Uint8Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  const buffer = normalized.buffer as ArrayBuffer
  return new Blob([buffer], { type: 'application/pdf' })
}

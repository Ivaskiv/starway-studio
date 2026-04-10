// frontend/src/features/reportsPdf/services/pdfClient.ts
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

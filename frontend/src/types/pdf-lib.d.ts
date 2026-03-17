declare module 'pdf-lib' {
  export class PDFDocument {
    static load(data: ArrayBuffer | Uint8Array | string): Promise<PDFDocument>
    save(): Promise<Uint8Array>
    getPages(): PDFPage[]
    addPage(): PDFPage
  }

  export interface PDFPage {
    drawText(text: string, options: {
      x: number
      y: number
      size?: number
    }): void
  }
}

declare module 'pdfmake/interfaces' {
  export interface StyleDefinition {
    fontSize?: number
    bold?: boolean
    color?: string
    margin?: number | number[]
    lineHeight?: number
    fillColor?: string
    alignment?: 'left' | 'right' | 'center' | 'justify'
    width?: string | number
    height?: string | number
    font?: string
  }

  export interface StyleDictionary {
    [name: string]: StyleDefinition
  }

  export interface TDocumentDefinitions {
    content?: any
    styles?: StyleDictionary
    defaultStyle?: StyleDefinition
    pageMargins?: number | [number, number, number, number]
    pageOrientation?: 'portrait' | 'landscape'
    pageSize?: 'A4' | 'A3' | 'LETTER' | string
    footer?: any
    header?: any
  }
}

declare module 'pdfmake' {
  import { TDocumentDefinitions } from 'pdfmake/interfaces'

  export interface FontDefinition {
    normal?: string
    bold?: string
    italics?: string
    bolditalics?: string
  }

  export type FontDescriptors = Record<string, FontDefinition>

  type PdfDocument = {
    on: (event: 'data' | 'end' | 'error', listener: (...args: any[]) => void) => void
    end: () => void
  }

  export default class PdfPrinter {
    constructor(fonts: FontDescriptors)
    createPdfKitDocument(docDefinition: TDocumentDefinitions): PdfDocument
  }
}

declare module 'pdfmake/build/pdfmake' {
  type PdfMake = {
    vfs: Record<string, string>
    createPdf: (docDefinition: import('pdfmake/interfaces').TDocumentDefinitions) => {
      download: (filename?: string, cb?: () => void) => void
      open: () => void
      getBlob: (cb: (blob: Blob) => void) => void
      getBase64: (cb: (base64: string) => void) => void
    }
  }
  const pdfMake: PdfMake
  export default pdfMake
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: { vfs: Record<string, string> }
  export default pdfFonts
}

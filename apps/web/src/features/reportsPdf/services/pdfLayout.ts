// pdf/layout.ts

export const PdfLayout = (
  startY: number = 800,
  step: number = 20
) => {
  let y = startY

  return {
    next() {
      y -= step
      return y
    },

    space(px: number) {
      y -= px
      return y
    },

    current() {
      return y
    },

    reset(newY: number = startY) {
      y = newY
      return y
    },
  }
}
// Usage:
// const layout = createPdfLayout()
// const y = layout.next() // 780
// const y = layout.space(10) // 770
// const y = layout.current() // 770
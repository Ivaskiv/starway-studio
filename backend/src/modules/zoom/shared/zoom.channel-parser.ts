export interface ParsedZoomPost {
  scheduledAt: Date
  topic: string
  zoomLink: string
  isValid: boolean
  errors: string[]
}

export function parseZoomChannelPost(text: string): ParsedZoomPost {
  const result: ParsedZoomPost = {
    scheduledAt: new Date(),
    topic: '',
    zoomLink: '',
    isValid: false,
    errors: [],
  }

  const lowered = text.toLowerCase()
  const hasStructure = (
    lowered.includes('дата:')
    && lowered.includes('час:')
    && lowered.includes('тема:')
  )
  const hasTag = text.includes('#zoom')

  if (!hasStructure && !hasTag) {
    return result
  }

  const lines = text.split('\n').map((line) => line.trim())
  const dateLine = lines.find((line) => line.toLowerCase().startsWith('дата:'))
  const timeLine = lines.find((line) => line.toLowerCase().startsWith('час:'))
  const topicLine = lines.find((line) => line.toLowerCase().startsWith('тема:'))
  const linkLine = lines.find((line) => line.toLowerCase().startsWith('link:'))

  if (!dateLine) {
    result.errors.push('Відсутнє поле Дата')
  } else {
    const dateStr = dateLine.split(':')[1]?.trim() ?? ''
    const [day, month, year] = dateStr.split('.').map(Number)
    if (!day || !month || !year) {
      result.errors.push(`Невірний формат дати: ${dateStr}`)
    } else if (!timeLine) {
      result.errors.push('Відсутнє поле Час')
    } else {
      const timeStr = timeLine.split(':').slice(1).join(':').trim()
      const [hours, minutes] = timeStr.split(':').map(Number)
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        result.errors.push(`Невірний формат часу: ${timeStr}`)
      } else {
        result.scheduledAt = new Date(year, month - 1, day, hours, minutes, 0, 0)
        if (result.scheduledAt <= new Date()) {
          result.errors.push('Дата має бути в майбутньому')
        }
      }
    }
  }

  if (!topicLine) {
    result.errors.push('Відсутнє поле Тема')
  } else {
    result.topic = topicLine.split(':').slice(1).join(':').trim()
    if (!result.topic) {
      result.errors.push('Тема не може бути порожньою')
    }
  }

  if (!linkLine) {
    result.zoomLink = ''
  } else {
    result.zoomLink = linkLine.split(':').slice(1).join(':').trim()
    if (result.zoomLink && !result.zoomLink.startsWith('https://')) {
      result.errors.push('Link має починатись з https://')
    }
  }

  result.isValid = result.errors.length === 0
  return result
}

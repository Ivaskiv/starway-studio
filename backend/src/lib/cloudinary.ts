import { v2 as cloudinary } from 'cloudinary'

let configured = false

function normalize(value: string | undefined | null): string {
  return String(value ?? '').trim()
}

export function hasCloudinaryConfig(): boolean {
  const cloudinaryUrl = normalize(process.env.CLOUDINARY_URL)
  if (cloudinaryUrl && cloudinaryUrl !== 'SET') return true

  const cloudName = normalize(process.env.CLOUDINARY_CLOUD_NAME)
  const apiKey = normalize(process.env.CLOUDINARY_API_KEY)
  const apiSecret = normalize(process.env.CLOUDINARY_API_SECRET)

  return Boolean(cloudName && cloudName !== 'SET')
    && Boolean(apiKey && apiKey !== 'SET')
    && Boolean(apiSecret && apiSecret !== 'SET')
}

export function getCloudinaryClient() {
  if (!hasCloudinaryConfig()) {
    throw new Error('cloudinary_not_configured')
  }

  if (!configured) {
    const cloudinaryUrl = normalize(process.env.CLOUDINARY_URL)

    if (cloudinaryUrl && cloudinaryUrl !== 'SET') {
      cloudinary.config({ cloudinary_url: cloudinaryUrl })
    } else {
      cloudinary.config({
        cloud_name: normalize(process.env.CLOUDINARY_CLOUD_NAME),
        api_key: normalize(process.env.CLOUDINARY_API_KEY),
        api_secret: normalize(process.env.CLOUDINARY_API_SECRET),
        secure: true,
      })
    }

    configured = true
  }

  return cloudinary
}

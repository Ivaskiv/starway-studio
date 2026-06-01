import type { MediaAssets, ReelsVariant } from '../pipeline.types.js'

export async function produceMediaAssets(variant: ReelsVariant): Promise<MediaAssets> {
  const [scenes, audio] = await Promise.all([
    generateVideoScenes(variant.scenes),
    generateVoice(variant.voiceScript),
  ])

  return { scenes, audio }
}

async function generateVideoScenes(scenes: ReelsVariant['scenes']): Promise<string[]> {
  const results: string[] = []
  for (const scene of scenes) {
    const duration = Math.max(1, scene.timeTo - scene.timeFrom)
    const videoUrl = await callKlingOrFallback(scene.klingPrompt, duration)
    results.push(videoUrl)
  }
  return results
}

async function callKlingOrFallback(prompt: string, durationSec: number): Promise<string> {
  if (process.env.KLING_API_KEY) {
    return callKlingApi(prompt, durationSec)
  }
  if (process.env.FAL_KEY) {
    return callFalApi(prompt, durationSec)
  }
  throw new Error('KLING_API_KEY або FAL_KEY відсутні в .env')
}

async function callKlingApi(prompt: string, duration: number): Promise<string> {
  const res = await fetch('https://api.klingai.com/v1/videos/text2video', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KLING_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_name: 'kling-v2-master',
      prompt,
      duration: duration <= 5 ? '5' : '10',
      aspect_ratio: '9:16',
      mode: 'std',
    }),
  })

  if (!res.ok) {
    throw new Error(`Kling API error: ${res.status}`)
  }
  const data = await res.json() as { data?: { task_id?: string } }
  const taskId = data.data?.task_id
  if (!taskId) throw new Error('Kling API: task_id відсутній')
  return pollKlingTask(taskId)
}

async function pollKlingTask(taskId: string): Promise<string> {
  for (let i = 0; i < 30; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10_000))
    const res = await fetch(`https://api.klingai.com/v1/videos/text2video/${taskId}`, {
      headers: { Authorization: `Bearer ${process.env.KLING_API_KEY}` },
    })
    if (!res.ok) continue

    const data = await res.json() as {
      data?: {
        task_status?: string
        task_status_msg?: string
        task_result?: { videos?: Array<{ url?: string }> }
      }
    }

    if (data.data?.task_status === 'succeed') {
      const url = data.data.task_result?.videos?.[0]?.url
      if (!url) throw new Error('Kling task succeed без URL')
      return url
    }
    if (data.data?.task_status === 'failed') {
      throw new Error(`Kling task failed: ${data.data.task_status_msg ?? 'unknown'}`)
    }
  }

  throw new Error('Kling polling timeout (5 хвилин)')
}

async function callFalApi(prompt: string, duration: number): Promise<string> {
  const res = await fetch('https://fal.run/fal-ai/kling-video/v2/master/text-to-video', {
    method: 'POST',
    headers: {
      Authorization: `Key ${process.env.FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      duration: `${duration <= 5 ? 5 : 10}`,
      aspect_ratio: '9:16',
    }),
  })

  if (!res.ok) {
    throw new Error(`Fal API error: ${res.status}`)
  }

  const data = await res.json() as {
    video?: { url?: string }
    output?: { video_url?: string }
  }

  const url = data.video?.url ?? data.output?.video_url
  if (!url) throw new Error('Fal API повернув порожній video URL')
  return url
}

async function generateVoice(script: string): Promise<string> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!voiceId || !apiKey) {
    throw new Error('ELEVENLABS_VOICE_ID або ELEVENLABS_API_KEY відсутні')
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: script,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.65,
        similarity_boost: 0.85,
        style: 0.3,
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`ElevenLabs error: ${res.status}`)
  }

  const audioBuffer = await res.arrayBuffer()
  return uploadToCloudinary(Buffer.from(audioBuffer), 'audio/mpeg', 'audio')
}

async function uploadToCloudinary(buffer: Buffer, mimeType: string, folder: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  if (!cloudName) {
    throw new Error('CLOUDINARY_CLOUD_NAME відсутній')
  }

  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }))
  formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET || 'starway_pipeline')
  formData.append('folder', `starway/${folder}`)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Cloudinary upload error: ${res.status}`)
  }

  const data = await res.json() as { secure_url?: string }
  if (!data.secure_url) {
    throw new Error('Cloudinary response не містить secure_url')
  }

  return data.secure_url
}

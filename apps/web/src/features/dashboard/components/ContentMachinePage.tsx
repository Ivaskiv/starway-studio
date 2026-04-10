import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import ContentStudioPanel, { type ContentStudioPanelRequest } from '@/features/content-studio/components/ContentStudioPanel'
import type { ContentStudioStep } from '@/features/content-studio/config/contentStudio.config'

export default function ContentMachinePage() {
  const location = useLocation()
  const [machineRequest, setMachineRequest] = useState<ContentStudioPanelRequest>({
    token: Date.now(),
    tab: 'input',
    step: 0,
  })

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const section = searchParams.get('section')
    const rawStep = searchParams.get('step')
    const step = rawStep ? Number(rawStep) : 0
    if (section !== 'content' || Number.isNaN(step)) return

    const contentStep = step as ContentStudioStep
    setMachineRequest((current) => ({
      ...(current ?? {}),
      token: Date.now(),
      tab: contentStep >= 9 ? 'publish' : contentStep >= 7 ? 'scripts' : 'input',
      openReelsPipeline: contentStep === 9,
      step: contentStep,
    }))
  }, [location.search])

  return (
    <div className="scroll-mt-24">
      <ContentStudioPanel request={machineRequest} />
    </div>
  )
}

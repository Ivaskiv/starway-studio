// apps/web/src/layouts/FocusLayout.tsx
import { useEffect, type ReactNode } from 'react'

import focusOgImageUrl from '@/features/landings/focus/assets/og-image.png'
import '@/features/landings/focus/styles/index.scss'
import {
  FOCUS_DESCRIPTION,
  FOCUS_OG_ALT,
  FOCUS_PUBLIC_FAVICON,
  FOCUS_ROUTE,
  FOCUS_TITLE,
} from '@/features/landings/focus/utils/constants'

function ensureMetaTag(selector: string, attributeName: string, attributeValue: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attributeName, attributeValue)
    document.head.appendChild(tag)
  }
  return tag
}

function ensureLinkTag(selector: string, rel: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(selector)
  if (!tag) {
    tag = document.createElement('link')
    tag.setAttribute('rel', rel)
    document.head.appendChild(tag)
  }
  return tag
}

type FocusLayoutProps = {
  children: ReactNode
}

export default function FocusLayout({ children }: FocusLayoutProps) {
  useEffect(() => {
    const previousTitle = document.title
    const origin = window.location.origin
    const canonicalHref = `${origin}${FOCUS_ROUTE}`

    const descriptionTag = ensureMetaTag('meta[name="description"]', 'name', 'description')
    const viewportTag = ensureMetaTag('meta[name="viewport"]', 'name', 'viewport')
    const ogTitleTag = ensureMetaTag('meta[property="og:title"]', 'property', 'og:title')
    const ogDescriptionTag = ensureMetaTag('meta[property="og:description"]', 'property', 'og:description')
    const ogImageTag = ensureMetaTag('meta[property="og:image"]', 'property', 'og:image')
    const ogImageAltTag = ensureMetaTag('meta[property="og:image:alt"]', 'property', 'og:image:alt')
    const ogTypeTag = ensureMetaTag('meta[property="og:type"]', 'property', 'og:type')
    const ogUrlTag = ensureMetaTag('meta[property="og:url"]', 'property', 'og:url')
    const twitterCardTag = ensureMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card')
    const twitterTitleTag = ensureMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title')
    const twitterDescriptionTag = ensureMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description')
    const twitterImageTag = ensureMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image')

    const faviconSvgTag = ensureLinkTag('link[rel="icon"][type="image/svg+xml"]', 'icon')
    const faviconPngTag = ensureLinkTag('link[rel="icon"][type="image/png"]', 'icon')
    const shortcutIconTag = ensureLinkTag('link[rel="shortcut icon"]', 'shortcut icon')
    const appleTouchIconTag = ensureLinkTag('link[rel="apple-touch-icon"]', 'apple-touch-icon')
    const manifestTag = ensureLinkTag('link[rel="manifest"]', 'manifest')
    const canonicalTag = ensureLinkTag('link[rel="canonical"]', 'canonical')

    const previousValues = {
      title: previousTitle,
      description: descriptionTag.getAttribute('content'),
      viewport: viewportTag.getAttribute('content'),
      ogTitle: ogTitleTag.getAttribute('content'),
      ogDescription: ogDescriptionTag.getAttribute('content'),
      ogImage: ogImageTag.getAttribute('content'),
      ogImageAlt: ogImageAltTag.getAttribute('content'),
      ogType: ogTypeTag.getAttribute('content'),
      ogUrl: ogUrlTag.getAttribute('content'),
      twitterCard: twitterCardTag.getAttribute('content'),
      twitterTitle: twitterTitleTag.getAttribute('content'),
      twitterDescription: twitterDescriptionTag.getAttribute('content'),
      twitterImage: twitterImageTag.getAttribute('content'),
      faviconSvg: faviconSvgTag.getAttribute('href'),
      faviconPng: faviconPngTag.getAttribute('href'),
      shortcutIcon: shortcutIconTag.getAttribute('href'),
      appleTouchIcon: appleTouchIconTag.getAttribute('href'),
      manifest: manifestTag.getAttribute('href'),
      canonical: canonicalTag.getAttribute('href'),
    }

    document.title = FOCUS_TITLE

    descriptionTag.setAttribute('content', FOCUS_DESCRIPTION)
    viewportTag.setAttribute('content', 'width=device-width, initial-scale=1.0')

    ogTitleTag.setAttribute('content', FOCUS_TITLE)
    ogDescriptionTag.setAttribute('content', FOCUS_DESCRIPTION)
    ogImageTag.setAttribute('content', focusOgImageUrl)
    ogImageAltTag.setAttribute('content', FOCUS_OG_ALT)
    ogTypeTag.setAttribute('content', 'website')
    ogUrlTag.setAttribute('content', canonicalHref)

    twitterCardTag.setAttribute('content', 'summary_large_image')
    twitterTitleTag.setAttribute('content', FOCUS_TITLE)
    twitterDescriptionTag.setAttribute('content', FOCUS_DESCRIPTION)
    twitterImageTag.setAttribute('content', focusOgImageUrl)

    faviconSvgTag.setAttribute('href', '/focus/favicon.svg')
    faviconSvgTag.setAttribute('type', 'image/svg+xml')
    faviconPngTag.setAttribute('href', FOCUS_PUBLIC_FAVICON)
    faviconPngTag.setAttribute('type', 'image/png')
    shortcutIconTag.setAttribute('href', FOCUS_PUBLIC_FAVICON)
    appleTouchIconTag.setAttribute('href', FOCUS_PUBLIC_FAVICON)

    manifestTag.setAttribute('href', '/focus/manifest.webmanifest')
    canonicalTag.setAttribute('href', canonicalHref)

    return () => {
      document.title = previousValues.title
    }
  }, [])

  return (
    <div className="focus-layout">
      <div className="focus-layout__main">{children}</div>
    </div>
  )
}

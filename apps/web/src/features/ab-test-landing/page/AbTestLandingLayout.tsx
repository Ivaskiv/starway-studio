import { useEffect, type ReactNode } from 'react'

import abTestVisualUrl from '../assets/ab-test-visual.svg'
import {
  AB_TEST_LANDING_SEO,
  AB_TEST_LANDING_ROUTE,
} from '../config'
import '../styles/index.scss'

function ensureMetaTag(
  selector: string,
  attributeName: string,
  attributeValue: string
) {
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

type AbTestLandingLayoutProps = {
  children: ReactNode
}

export default function  AbTestLandingLayout({ children }: AbTestLandingLayoutProps) {
  useEffect(() => {
    const hideAssistant = () => {
      const selectors = [
        '.assistant-overlay',
        '.assistant-panel-wrap',
        '.ava-bubble',
      ]
      selectors.forEach((selector) => {
        document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
          element.style.display = 'none'
        })
      })
    }

    hideAssistant()
    const observer = new MutationObserver(hideAssistant)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const previousTitle = document.title
    const origin = window.location.origin
    const canonicalHref = `${origin}${AB_TEST_LANDING_ROUTE}`
    const imageHref = new URL(abTestVisualUrl, origin).href

    const descriptionTag = ensureMetaTag(
      'meta[name="description"]',
      'name',
      'description'
    )
    const viewportTag = ensureMetaTag(
      'meta[name="viewport"]',
      'name',
      'viewport'
    )
    const ogTitleTag = ensureMetaTag(
      'meta[property="og:title"]',
      'property',
      'og:title'
    )
    const ogDescriptionTag = ensureMetaTag(
      'meta[property="og:description"]',
      'property',
      'og:description'
    )
    const ogImageTag = ensureMetaTag(
      'meta[property="og:image"]',
      'property',
      'og:image'
    )
    const ogImageAltTag = ensureMetaTag(
      'meta[property="og:image:alt"]',
      'property',
      'og:image:alt'
    )
    const ogTypeTag = ensureMetaTag(
      'meta[property="og:type"]',
      'property',
      'og:type'
    )
    const ogUrlTag = ensureMetaTag(
      'meta[property="og:url"]',
      'property',
      'og:url'
    )
    const twitterCardTag = ensureMetaTag(
      'meta[name="twitter:card"]',
      'name',
      'twitter:card'
    )
    const twitterTitleTag = ensureMetaTag(
      'meta[name="twitter:title"]',
      'name',
      'twitter:title'
    )
    const twitterDescriptionTag = ensureMetaTag(
      'meta[name="twitter:description"]',
      'name',
      'twitter:description'
    )
    const twitterImageTag = ensureMetaTag(
      'meta[name="twitter:image"]',
      'name',
      'twitter:image'
    )
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
      canonical: canonicalTag.getAttribute('href'),
    }

    document.title = AB_TEST_LANDING_SEO.title
    descriptionTag.setAttribute('content', AB_TEST_LANDING_SEO.description)
    viewportTag.setAttribute(
      'content',
      'width=device-width, initial-scale=1, viewport-fit=cover'
    )
    ogTitleTag.setAttribute('content', AB_TEST_LANDING_SEO.title)
    ogDescriptionTag.setAttribute('content', AB_TEST_LANDING_SEO.description)
    ogImageTag.setAttribute('content', imageHref)
    ogImageAltTag.setAttribute('content', AB_TEST_LANDING_SEO.imageAlt)
    ogTypeTag.setAttribute('content', 'website')
    ogUrlTag.setAttribute('content', canonicalHref)
    twitterCardTag.setAttribute('content', 'summary_large_image')
    twitterTitleTag.setAttribute('content', AB_TEST_LANDING_SEO.title)
    twitterDescriptionTag.setAttribute('content', AB_TEST_LANDING_SEO.description)
    twitterImageTag.setAttribute('content', imageHref)
    canonicalTag.setAttribute('href', canonicalHref)

    return () => {
      document.title = previousValues.title
      descriptionTag.setAttribute('content', previousValues.description ?? '')
      viewportTag.setAttribute(
        'content',
        previousValues.viewport ?? 'width=device-width, initial-scale=1, viewport-fit=cover'
      )
      ogTitleTag.setAttribute('content', previousValues.ogTitle ?? '')
      ogDescriptionTag.setAttribute('content', previousValues.ogDescription ?? '')
      ogImageTag.setAttribute('content', previousValues.ogImage ?? '')
      ogImageAltTag.setAttribute('content', previousValues.ogImageAlt ?? '')
      ogTypeTag.setAttribute('content', previousValues.ogType ?? '')
      ogUrlTag.setAttribute('content', previousValues.ogUrl ?? '')
      twitterCardTag.setAttribute('content', previousValues.twitterCard ?? '')
      twitterTitleTag.setAttribute('content', previousValues.twitterTitle ?? '')
      twitterDescriptionTag.setAttribute('content', previousValues.twitterDescription ?? '')
      twitterImageTag.setAttribute('content', previousValues.twitterImage ?? '')
      canonicalTag.setAttribute('href', previousValues.canonical ?? canonicalHref)
    }
  }, [])

  return <div className="ab-test-landing-layout">{children}</div>
}

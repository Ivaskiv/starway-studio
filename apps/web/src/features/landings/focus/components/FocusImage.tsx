// apps/web/src/features/landings/focus/components/FocusImage.tsx

export type FocusImageSrc = {
  mobile:   string
  mobile2x: string
  tablet:   string
  tablet2x: string
  desktop:  string
}

type Props = {
  src:       FocusImageSrc
  className?: string
  alt?:      string
  priority?: boolean   // true → fetchPriority="high" (only for above-the-fold)
}

export default function FocusImage({ src, className, alt = '', priority = false }: Props) {
  return (
    <picture>
      <source media="(max-width: 680px)"  srcSet={`${src.mobile} 1x, ${src.mobile2x} 2x`} />
      <source media="(max-width: 1100px)" srcSet={`${src.tablet} 1x, ${src.tablet2x} 2x`} />
      <img
        src={src.desktop}
        alt={alt}
        className={className}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        {...{ fetchpriority: priority ? 'high' : 'auto' }}
      />
    </picture>
  )
}

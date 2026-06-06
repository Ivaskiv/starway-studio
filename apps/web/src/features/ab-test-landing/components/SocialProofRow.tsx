type SocialProofProps = {
  leftBadge: string
  leftText: string
  rightTag: string
  rightQuote: string
  rightWho: string
}

export default function SocialProofRow({
  leftBadge,
  leftText,
  rightTag,
  rightQuote,
  rightWho,
}: SocialProofProps) {
  return (
    <div className="proof-row" aria-label="Social proof">
      <div className="proof-card">
        <div className="mini-ui" aria-hidden="true">
          <div className="mui-bar" />
          <div className="mui-bar s" />
          <div className="mui-bar m" />
          <div className="mui-row">
            <div className="mui-tag a" />
            <div className="mui-tag" />
            <div className="mui-tag a" />
          </div>
        </div>
        <div className="proof-label">
          <b>{leftBadge}</b>
          {leftText}
        </div>
      </div>

      <article className="transform-card">
        <div className="transform-tag">{rightTag}</div>
        <div className="transform-quote">{rightQuote}</div>
        <div className="transform-who">{rightWho}</div>
      </article>
    </div>
  )
}

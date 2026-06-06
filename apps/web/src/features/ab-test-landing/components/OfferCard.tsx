type OfferCardProps = {
  emoji: string
  title: string
  subtitle: string
  oldPrice: string
  newPrice: string
}

export default function OfferCard({
  emoji,
  title,
  subtitle,
  oldPrice,
  newPrice,
}: OfferCardProps) {
  return (
    <article className="offer-card">
      <div className="offer-emoji">{emoji}</div>
      <div className="offer-body">
        <div className="offer-title">{title}</div>
        <div className="offer-sub">{subtitle}</div>
      </div>
      <div className="offer-price">
        <div className="offer-old">{oldPrice}</div>
        <div className="offer-new">{newPrice}</div>
      </div>
    </article>
  )
}

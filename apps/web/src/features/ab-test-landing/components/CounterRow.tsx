type CounterItem = {
  value: string
  label: string
}

type CounterRowProps = {
  items: CounterItem[]
}

export default function CounterRow({ items }: CounterRowProps) {
  return (
    <div className="counter-strip" aria-label="Statistics">
      {items.map((item) => (
        <div key={item.label} className="ctr-item">
          <div className="ctr-num">{item.value}</div>
          <div className="ctr-label">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

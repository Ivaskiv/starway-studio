type WayForPayPayload = Record<string, unknown>

const ARRAY_FIELD_NAMES: Record<string, string> = {
  productName: 'productName[]',
  productPrice: 'productPrice[]',
  productCount: 'productCount[]',
}

export function submitWayForPayForm(action: string, payload: WayForPayPayload) {
  if (typeof document === 'undefined') return

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = action
  form.target = '_top'
  form.style.display = 'none'

  Object.entries(payload).forEach(([key, value]) => {
    if (value == null) return

    if (Array.isArray(value)) {
      const fieldName = ARRAY_FIELD_NAMES[key] ?? `${key}[]`
      value.forEach((item) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = fieldName
        input.value = String(item)
        form.appendChild(input)
      })
      return
    }

    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = key
    input.value = String(value)
    form.appendChild(input)
  })

  document.body.appendChild(form)
  form.submit()
  document.body.removeChild(form)
}

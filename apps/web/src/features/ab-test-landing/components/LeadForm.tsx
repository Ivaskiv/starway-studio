type LeadFormProps = {
  label: string
  placeholder: string
  phone: string
  onPhoneChange: (value: string) => void
}

export default function LeadForm({
  label,
  placeholder,
  phone,
  onPhoneChange,
}: LeadFormProps) {
  return (
    <div className="input-wrap">
      <div className="input-lbl">
        <span>*</span> {label}
      </div>
      <input
        className="phone-input"
        type="tel"
        id="ph"
        inputMode="tel"
        autoComplete="tel"
        value={phone}
        onChange={(event) => onPhoneChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

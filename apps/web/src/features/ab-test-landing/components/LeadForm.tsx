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
      <label className="input-lbl" htmlFor="ab-test-phone">
        <span>*</span> {label}
      </label>
      <input
        className="phone-input"
        type="tel"
        id="ab-test-phone"
        inputMode="tel"
        autoComplete="tel"
        value={phone}
        onChange={(event) => onPhoneChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

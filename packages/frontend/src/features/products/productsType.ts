//

export interface Module {
  value: string
  label: string
}

export interface ProductFormInputs {
  title: string
  price: number
  description: string
  modules: string[] 
}

export interface Product {
  id: string
  name: string
  price: number
  type: 'lead-magnet' | 'tripwire' | 'core' | 'upsell' | 'backend'
  order: number
}

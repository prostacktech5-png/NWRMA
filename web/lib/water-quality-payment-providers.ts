export type PaymentMethodType = 'mobile' | 'card' | 'bank'

export type PaymentProviderId =
  | 'orange'
  | 'qcell'
  | 'afrimoney'
  | 'card'
  | 'bank'

export type PaymentProvider = {
  id: PaymentProviderId
  name: string
  subtitle: string
  subtext: string
  type: PaymentMethodType
  logo: string
  accentClass: string
}

export const PAYMENT_PROVIDERS: PaymentProvider[] = [
  {
    id: 'orange',
    name: 'Orange Money',
    subtitle: 'Orange Money',
    subtext: 'Pay via Orange Mobile',
    type: 'mobile',
    logo: '/payments/orange-money.svg',
    accentClass: 'bg-orange-500',
  },
  {
    id: 'qcell',
    name: 'Qcell QMoney',
    subtitle: 'Qcell',
    subtext: 'Pay via QMoney',
    type: 'mobile',
    logo: '/payments/qcell-qmoney.svg',
    accentClass: 'bg-orange-500',
  },
  {
    id: 'afrimoney',
    name: 'Afrimoney',
    subtitle: 'Africell Afrimoney',
    subtext: 'Pay via Afrimoney',
    type: 'mobile',
    logo: '/payments/afrimoney.svg',
    accentClass: 'bg-red-600',
  },
  {
    id: 'card',
    name: 'Debit / credit card',
    subtitle: 'Mastercard & Visa',
    subtext: 'Debit or credit card',
    type: 'card',
    logo: '/payments/debit-credit-card.svg',
    accentClass: 'bg-slate-800',
  },
  {
    id: 'bank',
    name: 'Bank slip',
    subtitle: 'Bank transfer',
    subtext: 'Upload payment slip',
    type: 'bank',
    logo: '/payments/bank-slip.svg',
    accentClass: 'bg-slate-500',
  },
]

export const MOBILE_PROVIDERS = PAYMENT_PROVIDERS.filter((p) => p.type === 'mobile')
export const CARD_PROVIDERS = PAYMENT_PROVIDERS.filter((p) => p.type === 'card')
export const BANK_PROVIDERS = PAYMENT_PROVIDERS.filter((p) => p.type === 'bank')

export function getProviderById(id: PaymentProviderId): PaymentProvider | undefined {
  return PAYMENT_PROVIDERS.find((p) => p.id === id)
}

export type WaterQualityPaymentMeta = {
  providerId: PaymentProviderId
  providerLabel: string
  reference: string
}

'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Check,
  CreditCard,
  HelpCircle,
  Shield,
  ShieldCheck,
  Smartphone,
  Upload,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { DEFAULT_PUBLIC_LOGO_PATH } from '@/lib/app-branding'
import {
  BANK_PROVIDERS,
  CARD_PROVIDERS,
  getProviderById,
  MOBILE_PROVIDERS,
  type PaymentProvider,
  type PaymentProviderId,
  type WaterQualityPaymentMeta,
} from '@/lib/water-quality-payment-providers'

export type WaterQualityTestPackage = {
  id: string
  name: string
  description: string
  parameters: number
  price: number
}

type WaterQualityPaymentGatewayProps = {
  testPackages: WaterQualityTestPackage[]
  onPaid: (packageId: string, meta: WaterQualityPaymentMeta) => void
}

const ACCENT = '#EA580C'
const MERCHANT = 'NWRMA Water Quality Laboratory'

function PortalHeaderLogo() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/95 p-0.5 shadow-sm">
      <Image
        src={DEFAULT_PUBLIC_LOGO_PATH}
        alt=""
        width={40}
        height={40}
        className="h-9 w-9 object-contain"
      />
    </div>
  )
}

function ProviderCard({
  provider,
  selected,
  onSelect,
}: {
  provider: PaymentProvider
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative flex flex-col items-center rounded-xl border-2 bg-white p-4 text-center transition-all',
        selected ? 'border-[#EA580C] shadow-md' : 'border-gray-200 hover:border-gray-300'
      )}
    >
      {selected && (
        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#EA580C]">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
      <div className="mb-2 flex h-10 w-full items-center justify-center">
        <Image
          src={provider.logo}
          alt={provider.name}
          width={80}
          height={32}
          className="h-8 w-auto object-contain"
        />
      </div>
      <p className="text-xs font-semibold text-gray-900">{provider.subtitle}</p>
      <p className="mt-0.5 text-[10px] text-gray-500">{provider.subtext}</p>
    </button>
  )
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function WaterQualityPaymentGateway({
  testPackages,
  onPaid,
}: WaterQualityPaymentGatewayProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderId>('orange')
  const [mobileNumber, setMobileNumber] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardName, setCardName] = useState('')
  const [bankReference, setBankReference] = useState('')
  const [bankSlipName, setBankSlipName] = useState<string | null>(null)
  const [isPaying, setIsPaying] = useState(false)

  const selectedPackageData = testPackages.find((p) => p.id === selectedPackage)
  const provider = getProviderById(selectedProvider)
  const paymentMethod = provider?.type ?? 'mobile'

  const canProceed = useMemo(() => {
    if (!selectedPackage || !provider) return false
    if (paymentMethod === 'mobile') {
      const digits = mobileNumber.replace(/\D/g, '')
      return digits.length >= 8
    }
    if (paymentMethod === 'card') {
      const num = cardNumber.replace(/\D/g, '')
      const exp = cardExpiry.replace(/\D/g, '')
      return num.length === 16 && exp.length === 4 && cardCvv.length >= 3 && cardName.trim().length >= 2
    }
    return Boolean(bankSlipName || bankReference.trim().length >= 4)
  }, [
    selectedPackage,
    provider,
    paymentMethod,
    mobileNumber,
    cardNumber,
    cardExpiry,
    cardCvv,
    cardName,
    bankSlipName,
    bankReference,
  ])

  const buildReference = (): string => {
    if (paymentMethod === 'mobile') return mobileNumber.trim()
    if (paymentMethod === 'card') {
      const last4 = cardNumber.replace(/\D/g, '').slice(-4)
      return `card-****${last4}`
    }
    return bankReference.trim() || bankSlipName || 'bank-slip'
  }

  const handleProceed = () => {
    if (!canProceed || !selectedPackage || !provider) return
    setIsPaying(true)
    setTimeout(() => {
      setIsPaying(false)
      onPaid(selectedPackage, {
        providerId: provider.id,
        providerLabel: provider.name,
        reference: buildReference(),
      })
    }, 2000)
  }

  const handleBankFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setBankSlipName(file ? file.name : null)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f2f5]">
      <header className="bg-[#0d4a4a]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <PortalHeaderLogo />
            <div>
              <p className="text-sm font-semibold text-white">NWRMA</p>
              <p className="text-xs text-white/70">WATER QUALITY PAYMENTS</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="hidden items-center gap-1.5 text-xs text-white/80 sm:flex">
              <Shield className="h-3.5 w-3.5" />
              Secure payments
            </span>
            <Link
              href="mailto:info@nwrma.gov.sl"
              className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Help
            </Link>
            <span className="flex items-center gap-1.5 text-xs text-white/80">
              <Globe className="h-3.5 w-3.5" />
              English
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="flex items-start gap-4 border-b border-gray-100 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100">
                  {paymentMethod === 'card' ? (
                    <CreditCard className="h-6 w-6 text-[#EA580C]" />
                  ) : (
                    <Smartphone className="h-6 w-6 text-[#EA580C]" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Mobile money &amp; card payment</h1>
                  <p className="text-sm text-gray-500">
                    Pay securely using mobile money, debit/credit card, or bank transfer.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/80 px-6 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Merchant
                  </p>
                  <p className="font-semibold text-gray-900">{MERCHANT}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Amount
                  </p>
                  <p className="text-lg font-bold" style={{ color: ACCENT }}>
                    {selectedPackageData
                      ? `NLe ${selectedPackageData.price.toFixed(2)}`
                      : 'Select package'}
                  </p>
                </div>
              </div>

              <div className="space-y-8 p-6">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                    Laboratory test package
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {testPackages.map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPackage(pkg.id)}
                        className={cn(
                          'relative rounded-lg border-2 p-4 text-left transition-all',
                          selectedPackage === pkg.id
                            ? 'border-[#EA580C] bg-orange-50/50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        {selectedPackage === pkg.id && (
                          <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#EA580C]">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                        <div className="mb-1 flex items-start justify-between gap-2 pr-6">
                          <h3 className="text-sm font-semibold text-gray-900">{pkg.name}</h3>
                          <span className="shrink-0 rounded bg-[#EA580C] px-2 py-0.5 text-xs font-bold text-white">
                            NLe {pkg.price.toFixed(0)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-gray-500">{pkg.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-sm font-bold text-gray-900">
                    <span className="text-[#EA580C]">Step 1:</span> Select payment provider
                  </p>
                  <p className="mb-4 text-xs text-gray-500">Mobile money</p>
                  <div className="mb-6 grid grid-cols-3 gap-3">
                    {MOBILE_PROVIDERS.map((p) => (
                      <ProviderCard
                        key={p.id}
                        provider={p}
                        selected={selectedProvider === p.id}
                        onSelect={() => setSelectedProvider(p.id)}
                      />
                    ))}
                  </div>
                  <p className="mb-3 text-xs text-gray-500">Debit / credit card</p>
                  <div className="mb-6 grid grid-cols-1 gap-3 sm:max-w-xs">
                    {CARD_PROVIDERS.map((p) => (
                      <ProviderCard
                        key={p.id}
                        provider={p}
                        selected={selectedProvider === p.id}
                        onSelect={() => setSelectedProvider(p.id)}
                      />
                    ))}
                  </div>
                  <p className="mb-3 text-xs text-gray-500">Bank transfer</p>
                  <div className="grid grid-cols-1 gap-3 sm:max-w-xs">
                    {BANK_PROVIDERS.map((p) => (
                      <ProviderCard
                        key={p.id}
                        provider={p}
                        selected={selectedProvider === p.id}
                        onSelect={() => setSelectedProvider(p.id)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-bold text-gray-900">
                    <span className="text-[#EA580C]">Step 2:</span>{' '}
                    {paymentMethod === 'mobile' && 'Enter mobile money number'}
                    {paymentMethod === 'card' && 'Enter card details'}
                    {paymentMethod === 'bank' && 'Upload bank slip'}
                  </p>

                  {paymentMethod === 'mobile' && (
                    <>
                      <Label htmlFor="mobile" className="sr-only">
                        Mobile money number
                      </Label>
                      <div className="flex items-center gap-2">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                          <Image
                            src="/payments/sl-flag.svg"
                            alt="Sierra Leone"
                            width={24}
                            height={16}
                            className="rounded-sm"
                          />
                        </div>
                        <Input
                          id="mobile"
                          placeholder="07 123 45 67"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          className="h-11 flex-1 text-base"
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Enter the mobile money number registered to your account.
                      </p>
                    </>
                  )}

                  {paymentMethod === 'card' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="cardNumber">Card number</Label>
                        <Input
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          inputMode="numeric"
                          autoComplete="cc-number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardExpiry">Expiry (MM/YY)</Label>
                        <Input
                          id="cardExpiry"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                          inputMode="numeric"
                          autoComplete="cc-exp"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardCvv">CVV</Label>
                        <Input
                          id="cardCvv"
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) =>
                            setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))
                          }
                          inputMode="numeric"
                          autoComplete="cc-csc"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="cardName">Name on card</Label>
                        <Input
                          id="cardName"
                          placeholder="As shown on card"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          autoComplete="cc-name"
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'bank' && (
                    <div className="space-y-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={handleBankFile}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full flex-col items-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition-colors hover:border-[#EA580C] hover:bg-orange-50/30"
                      >
                        <Upload className="mb-2 h-8 w-8 text-gray-400" />
                        <p className="text-sm font-medium text-gray-700">
                          {bankSlipName ? bankSlipName : 'Click to upload bank slip'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">PDF, JPG, or PNG</p>
                      </button>
                      <div className="space-y-2">
                        <Label htmlFor="bankRef">Or payment reference</Label>
                        <Input
                          id="bankRef"
                          placeholder="Bank transaction reference"
                          value={bankReference}
                          onChange={(e) => setBankReference(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-orange-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#EA580C]" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Secure payment</p>
                      <p className="mt-1 text-xs text-gray-600">
                        {paymentMethod === 'mobile' &&
                          'You will receive a prompt on your phone to approve this payment when operator APIs are connected. Until then, staff verify references at intake.'}
                        {paymentMethod === 'card' &&
                          'Card details are transmitted over encrypted connections. Charges are simulated in this portal until a live payment gateway is connected.'}
                        {paymentMethod === 'bank' &&
                          'Upload a clear scan or photo of your bank deposit slip. Intake staff will match it to your application.'}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleProceed}
                  disabled={!canProceed || isPaying}
                  className="h-14 w-full gap-2 bg-[#EA580C] text-sm font-bold uppercase tracking-wider hover:bg-[#C2410C] disabled:opacity-50"
                >
                  {isPaying ? 'Processing…' : 'Proceed to Pay'}
                  {!isPaying && <ArrowRight className="h-5 w-5" />}
                </Button>

                <p className="text-center text-xs text-gray-400">
                  <Link href="/" className="underline hover:text-gray-600">
                    Back to portal overview
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <h2 className="mb-4 text-sm font-bold text-gray-900">Payment summary</h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Merchant</dt>
                    <dd className="text-right font-medium text-gray-900">{MERCHANT}</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-gray-100 pb-3">
                    <dt className="text-gray-500">Package</dt>
                    <dd className="text-right text-gray-900">
                      {selectedPackageData?.name ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Payment method</dt>
                    <dd className="text-right text-gray-900">{provider?.name ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-gray-100 pt-3">
                    <dt className="font-bold text-gray-900">Total</dt>
                    <dd className="text-2xl font-bold" style={{ color: ACCENT }}>
                      {selectedPackageData
                        ? `NLe ${selectedPackageData.price.toFixed(2)}`
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">100% secure payment</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Your transaction is protected with TLS encryption and Agency audit controls.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <p className="mb-2 text-sm font-bold text-gray-900">Need help?</p>
                <Link
                  href="mailto:info@nwrma.gov.sl"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#EA580C] hover:underline"
                >
                  Contact NWRMA intake
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-gray-200 bg-white">
        <div className="flex h-1.5">
          <div className="flex-1 bg-[#1EB53A]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#0072C6]" />
        </div>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <p className="text-xs text-gray-500">© 2026 National Water Resources Management Agency</p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
            <Link href="#" className="hover:text-gray-800">
              Terms &amp; Conditions
            </Link>
            <Link href="#" className="hover:text-gray-800">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-gray-800">
              Security
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import type { Conversion, Currency, Rate, User } from '@/types/api'
import { CURRENCIES } from '@/types/api'
import { Button, Card, Input, Money, Select } from '@/components/ui'
import { convert, getMe, getRate } from '@/lib/api/endpoints'
import { parseMoney } from '@/lib/format'
import styles from './page.module.css'

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }))

export default function ConvertPage() {
  const [from, setFrom] = useState<Currency>('USD')
  const [to, setTo] = useState<Currency>('NGN')
  const [amount, setAmount] = useState('')
  const [result, setResult] = useState<Conversion | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [user, setUser] = useState<User>()
  const [userError, setUserError] = useState(false)
  const [rate, setRate] = useState<Rate>()
  const [rateError, setRateError] = useState(false)

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => setUserError(true))
  }, [])

  useEffect(() => {
    getRate(from, to)
      .then((res) => {
        setRate(res.data)
        setRateError(false)
      })
      .catch(() => {
        // Never leave the previous pair's rate on screen next to the new currencies.
        setRate(undefined)
        setRateError(true)
      })
  }, [from, to])

  const value = parseMoney(amount, from) ?? 0
  const fee = Math.round(value * 0.015)
  const youGet = rate ? Math.floor(value * rate.rate) : 0
  const wallet = user?.wallets.find((w) => w.currency === from)
  const canSubmit = value > 0 && from !== to && !submitting

  const handleConvert = async () => {
    if (!canSubmit) return
    setError('')
    setSubmitting(true)
    try {
      const res = await convert({ from, to, amount: value })
      setResult(res.data)
      setAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Convert currency</h1>

      <Card>
        <div className={styles.row}>
          <Select
            label="From"
            options={CURRENCY_OPTIONS}
            value={from}
            onChange={(e) => setFrom(e.target.value as Currency)}
            fieldClassName={styles.currency}
          />
          <Input
            label="Amount"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            hint={
              wallet ? (
                <>
                  Balance: <Money amount={wallet.balance} currency={from} />
                </>
              ) : userError ? (
                'Balance unavailable'
              ) : (
                'Balance: …'
              )
            }
            fieldClassName={styles.amount}
          />
        </div>

        <Select
          label="To"
          options={CURRENCY_OPTIONS}
          value={to}
          onChange={(e) => setTo(e.target.value as Currency)}
          fieldClassName={styles.to}
        />

        <dl className={styles.summary}>
          <div className={styles.summaryRow}>
            <dt>Rate</dt>
            <dd>{rate ? `1 ${from} = ${rate.rate} ${to}` : rateError ? 'Unavailable' : '…'}</dd>
          </div>
          <div className={styles.summaryRow}>
            <dt>Fee (1.5%)</dt>
            <dd>
              <Money amount={fee} currency={from} />
            </dd>
          </div>
          <div className={styles.summaryTotal}>
            <dt>You get</dt>
            <dd>
              <Money amount={youGet} currency={to} />
            </dd>
          </div>
        </dl>

        {error && <p className={styles.error}>{error}</p>}

        <Button fullWidth onClick={handleConvert} disabled={!canSubmit}>
          {submitting ? 'Converting…' : 'Convert'}
        </Button>
      </Card>

      {result && (
        <Card className={styles.success}>
          Conversion successful. You received <Money amount={result.received} currency={result.to} />.
        </Card>
      )}
    </div>
  )
}

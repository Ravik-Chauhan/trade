import { useState } from 'react'
import Modal from './Modal'
import { LockInput } from './LockScreen'
import { useLock, type LockType } from '../store/useLock'
import { hashSecret } from '../lib/lock'
import { cx } from '../lib/utils'

/** Modal to create (or change) the PIN/pattern: enter once, then confirm. */
export default function LockSetup({ onClose }: { onClose: () => void }) {
  const setup = useLock((s) => s.setup)
  const lockOnResume = useLock((s) => s.lockOnResume)
  const [type, setType] = useState<LockType>('pin')
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [first, setFirst] = useState('')
  const [error, setError] = useState(false)
  const [msg, setMsg] = useState('')

  const flash = (m: string) => {
    setMsg(m)
    setError(true)
    window.setTimeout(() => setError(false), 650)
  }
  const minOk = (secret: string) => (type === 'pin' ? secret.length >= 4 : secret.split('-').length >= 4)

  const onComplete = async (secret: string) => {
    if (step === 'enter') {
      if (!minOk(secret)) {
        flash(type === 'pin' ? 'Use at least 4 digits' : 'Connect at least 4 dots')
        return
      }
      setFirst(secret)
      setStep('confirm')
      setMsg('')
      return
    }
    if (secret !== first) {
      flash('Did not match — start again')
      setStep('enter')
      setFirst('')
      return
    }
    const h = await hashSecret(secret)
    setup(type, h, lockOnResume)
    onClose()
  }

  const switchType = (t: LockType) => {
    setType(t)
    setStep('enter')
    setFirst('')
    setMsg('')
  }

  return (
    <Modal title="Set up app lock" onClose={onClose} footer={<button className="btn" onClick={onClose}>Cancel</button>}>
      <div className="view-switch" style={{ width: 'fit-content', marginBottom: 14 }}>
        <button className={cx(type === 'pin' && 'active')} onClick={() => switchType('pin')}>PIN</button>
        <button className={cx(type === 'pattern' && 'active')} onClick={() => switchType('pattern')}>Pattern</button>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>
        {step === 'enter'
          ? `Set a new ${type === 'pin' ? 'PIN (4+ digits)' : 'pattern (4+ dots)'}`
          : `Confirm your ${type === 'pin' ? 'PIN' : 'pattern'}`}
      </div>
      {msg && <div style={{ textAlign: 'center', color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{msg}</div>}
      <LockInput key={step + type} type={type} onComplete={onComplete} error={error} />
    </Modal>
  )
}

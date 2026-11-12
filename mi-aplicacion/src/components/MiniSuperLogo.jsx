import { MapPin, Store } from 'lucide-react'

function MiniSuperLogo({ compact = false }) {
  return (
    <div className={`mini-super-logo${compact ? ' compact' : ''}`}>
      <span className="logo-symbol" aria-hidden="true">
        <MapPin className="logo-pin" strokeWidth={1.8} />
        <Store className="logo-store" strokeWidth={2} />
      </span>
      <span className="logo-wordmark">Mini Súper</span>
    </div>
  )
}

export default MiniSuperLogo

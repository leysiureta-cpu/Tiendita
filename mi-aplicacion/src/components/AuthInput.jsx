import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

function AuthInput({
  autoComplete,
  icon: Icon,
  label,
  name,
  onChange,
  type = 'text',
  value,
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <label className="auth-field">
      <span className="auth-field-label">{label}</span>
      <span className="auth-input-wrap">
        <Icon className="auth-field-icon" size={18} aria-hidden="true" />
        <input
          autoComplete={autoComplete}
          name={name}
          onChange={onChange}
          required
          type={isPassword && !isPasswordVisible ? 'password' : 'text'}
          value={value}
        />
        {isPassword && (
          <button
            aria-label={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="password-visibility"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            type="button"
          >
            {isPasswordVisible ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        )}
      </span>
    </label>
  )
}

export default AuthInput

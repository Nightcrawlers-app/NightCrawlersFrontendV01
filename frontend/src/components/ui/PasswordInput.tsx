import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Optional label above the field (same style as the shared Input component). */
  label?: string;
  /** Use the shared <Input> component's base styling (for fields that used it before). */
  inputStyle?: boolean;
};

// Same base classes as components/ui/Input.tsx
const INPUT_BASE =
  'w-full px-4 py-3 border border-night-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-night-red-500 focus:border-transparent transition-colors duration-200';

/**
 * A password field with a show/hide (eye) button, so people can check what
 * they typed. Accepts every normal <input> prop; pass your usual className.
 */
const PasswordInput: React.FC<PasswordInputProps> = ({ className = '', label, inputStyle = false, ...props }) => {
  const [visible, setVisible] = useState(false);

  const field = (
    <div className="relative w-full">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        // Room on the right for the eye button
        className={`${inputStyle || label ? INPUT_BASE : ''} ${className} pr-10`}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-gray-400 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C62222]/40"
        tabIndex={0}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  if (!label) return field;
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-night-gray-700 mb-1">{label}</label>
      {field}
    </div>
  );
};

/**
 * "Passwords match ✓" / "Passwords don't match" under a confirm field.
 * Shows nothing until the person starts typing the confirmation.
 */
export const PasswordMatchHint: React.FC<{ password: string; confirm: string }> = ({ password, confirm }) => {
  if (!confirm) return null;
  const match = password === confirm;
  return (
    <p className={`text-[11px] font-medium ${match ? 'text-green-600' : 'text-[#C62222]'}`} role="status" aria-live="polite">
      {match ? '✓ Passwords match' : "Passwords don't match"}
    </p>
  );
};

export default PasswordInput;

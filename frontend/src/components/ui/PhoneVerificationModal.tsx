import React, { useState, useEffect } from 'react';
import { X, Phone, CheckCircle, Pencil } from 'lucide-react';
import { sendPhoneOtp, verifyPhoneOtp, setPhoneNumber, toErrorMessage } from '../../services/api';
import type { PhoneRole } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface PhoneVerificationModalProps {
  onClose: () => void;
  onVerified: () => void;
  /** If true, user cannot dismiss the modal without verifying */
  required?: boolean;
  /** Whose phone: customer (default), vendor or rider. */
  role?: PhoneRole;
  /** The number on file, if any. With none, the modal asks for one first. */
  currentPhone?: string | null;
}

const RESEND_COOLDOWN = 60; // seconds

const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  onClose,
  onVerified,
  required = false,
  role = 'customer',
  currentPhone,
}) => {
  const { refreshUser } = useAuth();
  // Customers pass no number here (their profile has it), so start at 'send'.
  const needsNumber = role !== 'customer' && !currentPhone;
  const [step, setStep] = useState<'number' | 'send' | 'verify' | 'done'>(needsNumber ? 'number' : 'send');
  const [phoneInput, setPhoneInput] = useState(currentPhone ?? '');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState(currentPhone ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSaveNumber = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await setPhoneNumber(phoneInput, role);
      setPhone(res.phone);
      setStep('send');
    } catch (err) {
      setError(toErrorMessage(err, "Couldn't save that number."));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await sendPhoneOtp(role);
      setPhone(res.phone);
      setStep('verify');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(toErrorMessage(err, 'Could not send OTP. Make sure your phone number is saved on your profile.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      await verifyPhoneOtp(code, role);
      if (role === 'customer') await refreshUser?.();
      setStep('done');
      setTimeout(() => {
        onVerified();
      }, 1200);
    } catch (err) {
      setError(toErrorMessage(err, 'Invalid or expired code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const primaryBtn =
    'w-full py-2.5 bg-[#C62222] text-white rounded-lg text-sm font-semibold hover:bg-[#A01B1B] transition-colors disabled:opacity-50';
  const icon = (
    <div className="w-12 h-12 bg-[#FFF0F0] rounded-full flex items-center justify-center mx-auto">
      <Phone size={22} className="text-[#C62222]" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        {!required && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}

        {step === 'number' && (
          <div className="text-center space-y-4">
            {icon}
            <div>
              <h2 className="text-base font-bold text-gray-900">Your phone number</h2>
              <p className="text-xs text-gray-500 mt-1">We'll text a 6-digit code to confirm it's yours.</p>
            </div>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phoneInput}
              onChange={e => { setPhoneInput(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && phoneInput.trim() && handleSaveNumber()}
              placeholder="0803 123 4567"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-center text-lg tracking-wide focus:outline-none focus:border-[#C62222] transition-colors"
            />
            {error && <p className="text-xs text-[#C62222]">{error}</p>}
            <button onClick={handleSaveNumber} disabled={loading || !phoneInput.trim()} className={primaryBtn}>
              {loading ? 'Saving…' : 'Continue'}
            </button>
          </div>
        )}

        {step === 'send' && (
          <div className="text-center space-y-4">
            {icon}
            <div>
              <h2 className="text-base font-bold text-gray-900">Verify your phone number</h2>
              <p className="text-xs text-gray-500 mt-1">
                {required
                  ? 'You need to verify your phone number before placing an order.'
                  : phone
                    ? <>We'll send a 6-digit code to <span className="font-medium text-gray-700">{phone}</span>.</>
                    : "We'll send a 6-digit code to your phone number on file."}
              </p>
              {role !== 'customer' && (
                <button
                  type="button"
                  onClick={() => { setStep('number'); setError(''); }}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-[#C62222]"
                >
                  <Pencil size={11} /> Change number
                </button>
              )}
            </div>
            {error && <p className="text-xs text-[#C62222]">{error}</p>}
            <button onClick={handleSend} disabled={loading} className={primaryBtn}>
              {loading ? 'Sending…' : 'Send Code'}
            </button>
            {!required && (
              <button onClick={onClose} className="w-full text-xs text-gray-400 hover:text-gray-600">
                Skip for now
              </button>
            )}
          </div>
        )}

        {step === 'verify' && (
          <div className="text-center space-y-4">
            {icon}
            <div>
              <h2 className="text-base font-bold text-gray-900">Enter the code</h2>
              <p className="text-xs text-gray-500 mt-1">
                Sent to <span className="font-medium text-gray-700">{phone}</span>
              </p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              placeholder="123456"
              maxLength={6}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-center text-xl font-mono tracking-widest focus:outline-none focus:border-[#C62222] transition-colors"
            />
            {error && <p className="text-xs text-[#C62222]">{error}</p>}
            <button onClick={handleVerify} disabled={loading || code.length !== 6} className={primaryBtn}>
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              onClick={() => { setStep('send'); setCode(''); setError(''); }}
              disabled={cooldown > 0}
              className="w-full text-xs text-gray-400 hover:text-[#C62222] disabled:cursor-not-allowed transition-colors"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-3 py-2">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Phone verified!</h2>
            <p className="text-xs text-gray-500">Your phone number has been verified successfully.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhoneVerificationModal;

import React, { useState, useEffect } from 'react';
import { X, Phone, CheckCircle } from 'lucide-react';
import { sendPhoneOtp, verifyPhoneOtp, toErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface PhoneVerificationModalProps {
  onClose: () => void;
  onVerified: () => void;
  /** If true, user cannot dismiss the modal without verifying */
  required?: boolean;
}

const RESEND_COOLDOWN = 60; // seconds

const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  onClose,
  onVerified,
  required = false,
}) => {
  const { refreshUser } = useAuth();
  const [step, setStep] = useState<'send' | 'verify' | 'done'>('send');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSend = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await sendPhoneOtp();
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
      await verifyPhoneOtp(code);
      await refreshUser?.();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        {!required && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}

        {step === 'send' && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-[#FFF0F0] rounded-full flex items-center justify-center mx-auto">
              <Phone size={22} className="text-[#C62222]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Verify your phone number</h2>
              <p className="text-xs text-gray-500 mt-1">
                {required
                  ? 'You need to verify your phone number before placing an order.'
                  : 'We\'ll send a 6-digit code to your phone number on file.'}
              </p>
            </div>
            {error && <p className="text-xs text-[#C62222]">{error}</p>}
            <button
              onClick={handleSend}
              disabled={loading}
              className="w-full py-2.5 bg-[#C62222] text-white rounded-lg text-sm font-semibold hover:bg-[#A01B1B] transition-colors disabled:opacity-50"
            >
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
            <div className="w-12 h-12 bg-[#FFF0F0] rounded-full flex items-center justify-center mx-auto">
              <Phone size={22} className="text-[#C62222]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Enter the code</h2>
              <p className="text-xs text-gray-500 mt-1">
                Sent to <span className="font-medium text-gray-700">{phone}</span>
              </p>
            </div>
            <input
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              placeholder="123456"
              maxLength={6}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-center text-xl font-mono tracking-widest focus:outline-none focus:border-[#C62222] transition-colors"
            />
            {error && <p className="text-xs text-[#C62222]">{error}</p>}
            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full py-2.5 bg-[#C62222] text-white rounded-lg text-sm font-semibold hover:bg-[#A01B1B] transition-colors disabled:opacity-50"
            >
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
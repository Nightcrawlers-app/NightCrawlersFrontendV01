import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import signupImage from '../../assets/signup-image.png';
import signupLogo from '../../assets/signup-logo.png';
import mailIcon from '../../assets/mail.svg';
import { useAuth } from '../../context/AuthContext';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

const VerifyEmail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifySignup, resendSignupCode } = useAuth();

  // The email comes from SignUp's navigate(..., { state: { email } }).
  // If someone lands here directly (refresh, back button, bookmarked link)
  // there's no email to verify against — send them back to sign up instead
  // of showing a form that can never succeed.
  const email = (location.state as { email?: string } | null)?.email ?? '';

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) navigate('/signup', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  const handleDigitChange = (index: number, rawValue: string) => {
    setError('');
    // Handle pasting a full code into any single box.
    const pasted = rawValue.replace(/\D/g, '');
    if (pasted.length > 1) {
      const next = Array(CODE_LENGTH).fill('');
      for (let i = 0; i < pasted.length && index + i < CODE_LENGTH; i++) {
        next[index + i] = pasted[i];
      }
      setDigits(next);
      focusInput(Math.min(index + pasted.length, CODE_LENGTH - 1));
      return;
    }

    const value = pasted.slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < CODE_LENGTH - 1) focusInput(index + 1);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
  };

  const code = digits.join('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== CODE_LENGTH) {
      setError(`Enter all ${CODE_LENGTH} digits.`);
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const result = await verifySignup(email, code);
      if (result.success) {
        navigate('/user-profile');
      } else {
        setError(result.error || 'That code didn\'t work. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResendMessage('');
    setError('');
    const result = await resendSignupCode(email);
    if (result.success) {
      setResendMessage('A new code is on its way.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      setError(result.error || 'Could not resend the code.');
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-white">
      <div className="flex h-full">
        {/* Left Side - Image (Hidden on mobile) */}
        <div className="hidden lg:block lg:w-1/2 xl:w-[60%] h-full">
          <img src={signupImage} alt="Verify your email" className="w-full h-full object-cover" />
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-[320px] sm:max-w-[340px] mx-auto">
              {/* Header Section */}
              <div className="flex flex-col items-center text-center mb-4 sm:mb-6">
                <Link to="/" className="block p-0 m-0 mb-6">
                  <img src={signupLogo} alt="Night Crawlers" className="block w-[160px] sm:w-[160px] md:w-[160px] h-auto object-contain" />
                </Link>
                <h1 className="text-sm sm:text-base font-bold text-[#222222] mb-1 leading-tight">
                  Check your email
                </h1>
                <p className="text-[#667085] text-xs leading-tight max-w-sm">
                  We sent a {CODE_LENGTH}-digit code to{' '}
                  <span className="font-medium text-[#344054]">{email}</span>. Enter it below to
                  finish creating your account.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-xs text-red-600 text-center">{error}</p>
                </div>
              )}

              {/* Resend confirmation */}
              {resendMessage && !error && (
                <div className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-xs text-green-700 text-center">{resendMessage}</p>
                </div>
              )}

              {/* Form Section */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center gap-2">
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      maxLength={CODE_LENGTH}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-10 h-12 text-center text-lg font-semibold border border-[#D0D5DD] rounded-md shadow-sm focus:ring-2 focus:ring-[#C62222] focus:border-[#C62222] outline-none"
                    />
                  ))}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || code.length !== CODE_LENGTH}
                  className="w-full bg-[#C62222] text-white py-2 px-4 rounded-md hover:bg-[#A01B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying...
                    </>
                  ) : 'Verify Email'}
                </button>
              </form>

              {/* Resend */}
              <div className="mt-3 text-center">
                <p className="text-xs text-[#667085]">
                  Didn't get a code?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0}
                    className="text-[#C62222] hover:underline font-medium disabled:text-[#98A2B3] disabled:no-underline disabled:cursor-not-allowed"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>
                </p>
              </div>
            </div>
          </div>
          <div className="w-full flex items-center justify-between text-xs text-[#667085] px-1">
            <span>© Night Crawlers 2026, inc</span>
            <a href="mailto:help@nightcrawlers.com" className="flex items-center gap-2 hover:text-[#C62222]">
              <img src={mailIcon} alt="" className="w-3.5 h-3.5" />
              help@nightcrawlers.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

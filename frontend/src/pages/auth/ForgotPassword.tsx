import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import signinImage from '../../assets/signin-image.png';
import signupLogo from '../../assets/signup-logo.png';
import mailIcon from '../../assets/mail.svg';
import { forgotPassword, toErrorMessage } from '../../services/api';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await forgotPassword(email);
      setSent(true);
      // Navigate to reset page after short delay
      setTimeout(() => navigate('/reset-password', { state: { email } }), 1500);
    } catch (err) {
      setError(toErrorMessage(err, 'Could not send reset code. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-white">
      <div className="flex h-full">
        {/* Left Side - Image */}
        <div className="hidden lg:block lg:w-1/2 xl:w-[60%] min-h-screen">
          <img src={signinImage} alt="Forgot Password" className="w-full h-full object-cover" />
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-[320px] sm:max-w-[340px] mx-auto">

              <div className="flex flex-col items-center text-center mb-6">
                <img src={signupLogo} alt="Night Crawlers" className="h-10 w-auto mb-4" />
                <h1 className="text-lg font-bold text-[#101828]">Forgot your password?</h1>
                <p className="text-xs text-[#667085] mt-1 max-w-[260px]">
                  No worries — enter your email and we'll send you a reset code.
                </p>
              </div>

              {sent ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#101828]">Reset code sent!</p>
                  <p className="text-xs text-[#667085] mt-1">Redirecting you to reset your password…</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#344054]">Email*</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 border border-[#D0D5DD] rounded-md shadow-sm text-xs focus:ring-2 focus:ring-[#C62222] focus:border-[#C62222]"
                      required
                    />
                  </div>

                  {error && <p className="text-xs text-[#C62222]">{error}</p>}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#C62222] text-white py-2 px-4 rounded-md hover:bg-[#A01B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                  >
                    {isSubmitting ? 'Sending…' : 'Send Reset Code'}
                  </button>

                  <div className="text-center">
                    <Link to="/signin" className="text-xs text-[#667085] hover:text-[#C62222]">
                      ← Back to Sign In
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="w-full flex items-center justify-between text-xs text-[#667085] px-1">
            <span>© Night Crawlers 2026, inc</span>
            <a href="mailto:help@nightcrawlers.app" className="flex items-center gap-2 hover:text-[#C62222]">
              <img src={mailIcon} alt="" className="w-3.5 h-3.5" />
              help@nightcrawlers.app
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
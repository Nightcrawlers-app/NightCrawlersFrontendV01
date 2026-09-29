import React, { useState } from 'react';
import PageNav from '../../components/ui/PageNav';
import PasswordInput, { PasswordMatchHint } from '../../components/ui/PasswordInput';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SignUpForm } from '../../types';
import Input from '../../components/ui/Input';
import signupImage from '../../assets/signup-image.webp';
import signupLogo from '../../assets/logo.svg';
import mailIcon from '../../assets/mail.svg';
import { useAuth } from '../../context/AuthContext';

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState<SignUpForm>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { signup } = useAuth();
  // Referral links look like /signup?ref=ADA7K2Q — the code fills itself in.
  const [searchParams] = useSearchParams();
  const refFromLink = (searchParams.get('ref') || '').trim().toUpperCase().slice(0, 20);
  const [referralCode, setReferralCode] = useState(refFromLink);
  const [showReferral, setShowReferral] = useState(Boolean(refFromLink));
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await signup({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        ...(referralCode.trim() && { referralCode: referralCode.trim().toUpperCase() }),
      });
      if (result.success) {
        // Signup only creates the account and emails a code — it does not
        // log the user in. Send them to enter that code next.
        navigate('/verify-email', { state: { email: formData.email } });
      } else {
        setError(result.error || 'Could not create account. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-white">
      <PageNav />
      <div className="flex h-full">
        {/* Left Side - Image (Hidden on mobile) */}
        <div className="hidden lg:block lg:w-1/2 xl:w-[60%] h-full">
          <img src={signupImage} alt="Sign Up" className="w-full h-full object-cover" />
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-[320px] sm:max-w-[340px] mx-auto">
              {/* Header Section */}
              <div className="flex flex-col items-center text-center mb-2 sm:mb-3">
                <Link to="/" className="block p-0 m-0 mb-6">
                  <img src={signupLogo} alt="Nightcrawlers" className="block w-[160px] sm:w-[160px] md:w-[160px] h-auto object-contain" />
                </Link>
                <h1 className="text-sm sm:text-base font-bold text-[#222222] mb-1 leading-tight">
                  Start Your Nightcrawlers Journey
                </h1>
                <p className="text-[#667085] text-xs leading-tight max-w-sm">
                  Sign up to enjoy fast delivery, exclusive offers, and a personalized Nightcrawlers experience!
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-xs text-red-600 text-center">{error}</p>
                </div>
              )}

              {/* Form Section */}
              <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#344054]">Username*</label>
                  <Input
                    type="text"
                    name="username"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-md shadow-sm text-xs focus:ring-2 focus:ring-[#E00B0B] focus:border-[#E00B0B]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#344054]">Email*</label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-md shadow-sm text-xs focus:ring-2 focus:ring-[#E00B0B] focus:border-[#E00B0B]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#344054]">Password*</label>
                  <div className="relative">
                    <PasswordInput
                      inputStyle
                      name="password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#D0D5DD] rounded-md shadow-sm text-xs focus:ring-2 focus:ring-[#E00B0B] focus:border-[#E00B0B]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#344054]">Confirm Password*</label>
                  <div className="relative">
                    <PasswordInput
                      inputStyle
                      name="confirmPassword"
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#D0D5DD] rounded-md shadow-sm text-xs focus:ring-2 focus:ring-[#E00B0B] focus:border-[#E00B0B]"
                      required
                    />
                  </div>
                  <PasswordMatchHint password={formData.password} confirm={formData.confirmPassword} />
                  <p className="text-[10px] text-[#98A2B3]">Must be at least 8 characters.</p>
                </div>

                {/* Friend's referral code (optional). Collapsed unless they came from a referral link. */}
                {showReferral ? (
                  <div className="space-y-1">
                    <label htmlFor="referralCode" className="block text-xs font-semibold text-[#344054]">Referral code</label>
                    <Input
                      id="referralCode"
                      type="text"
                      name="referralCode"
                      placeholder="e.g. ADA7K2Q"
                      autoCapitalize="characters"
                      autoComplete="off"
                      value={referralCode}
                      onChange={(e) => { setReferralCode(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 20)); setError(''); }}
                      className="w-full px-3 py-2 border border-[#D0D5DD] rounded-md shadow-sm text-xs uppercase tracking-wide focus:ring-2 focus:ring-[#E00B0B] focus:border-[#E00B0B]"
                    />
                    <p className="text-[10px] text-[#98A2B3]">Your first delivery is on us when you join with a friend's code.</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowReferral(true)}
                    className="text-[11px] font-medium text-[#E00B0B] hover:underline"
                  >
                    Have a referral code?
                  </button>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#E00B0B] text-white py-2 px-4 rounded-md hover:bg-[#B80909] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Account...
                    </>
                  ) : 'Create Account'}
                </button>
              </form>

              {/* Sign In Link */}
              <div className="mt-3 text-center">
                <p className="text-xs text-[#667085]">
                  Already have an account?{' '}
                  <Link to="/signin" className="text-[#E00B0B] hover:underline font-medium">
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          </div>
          <div className="w-full flex items-center justify-between text-xs text-[#667085] px-1">
            <span>© 2026 Nightcrawlers Limited</span>
            <a href="mailto:help@nightcrawlers.com" className="flex items-center gap-2 hover:text-[#E00B0B]">
              <img src={mailIcon} alt="" className="w-3.5 h-3.5" />
              help@nightcrawlers.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;

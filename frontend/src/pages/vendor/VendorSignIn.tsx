import React, { useState } from 'react';
import PasswordInput from '../../components/ui/PasswordInput';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import partnerLogo from '../../assets/vendor-partner-logo.svg';
import { signInVendor, signInRider, toErrorMessage } from '../../services/api';

type LoginType = 'partner' | 'rider';

const VendorSignIn: React.FC = () => {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<LoginType>('partner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      if (loginType === 'partner') {
        const vendor = await signInVendor(email, password);
        if (!vendor) {
          setErrorMessage('Incorrect email or password.');
          return;
        }
        navigate('/vendor-dashboard');
      } else {
        const rider = await signInRider(email, password);
        if (!rider) {
          setErrorMessage('Incorrect email or password.');
          return;
        }
        navigate('/rider-dashboard');
      }
    } catch (error) {
      setErrorMessage(toErrorMessage(error, 'Could not sign in. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white relative font-poppins">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[560px]">
          <div className="bg-[#f7f7f7] border border-[#e8e8e8] rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.05)] px-8 py-10 md:px-10 md:py-12">
            <div className="flex flex-col items-center gap-2 mb-6">
              <img
                src={partnerLogo}
                alt="Our Partners"
                className="h-14 sm:h-16 w-auto"
              />
              <div className="flex p-1 bg-white border border-gray-200 rounded-lg mt-4 w-full max-w-[300px] mx-auto">
                <button
                  type="button"
                  onClick={() => setLoginType('partner')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${loginType === 'partner'
                    ? 'bg-night-red-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                  Partner
                </button>
                <button
                  type="button"
                  onClick={() => setLoginType('rider')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${loginType === 'rider'
                    ? 'bg-night-red-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                  Rider
                </button>
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {loginType === 'partner' ? 'Partner Login' : 'Rider Login'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Sign in to manage your {loginType === 'partner' ? 'restaurant/store' : 'deliveries'}
              </p>
            </div>

            {errorMessage && (
              <p className="text-xs text-[#C62222] mb-4 text-center" role="alert">
                {errorMessage}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-1">
                <PasswordInput
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm text-night-gray-600">
                <label className="flex items-center gap-2 whitespace-nowrap">
                  <input type="checkbox" className="w-3.5 h-3.5 border border-[#d8d8d8] rounded-sm focus:ring-[#C62222]" />
                  <span>Remember for 30 days</span>
                </label>
                <Link to="/forgot-password" className="text-night-red-600 hover:underline whitespace-nowrap">Forgot password?</Link>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" className="w-full py-3 text-base rounded-sm" disabled={loading}>
                  {loading ? 'Signing in...' : 'Log In'}
                </Button>
              </div>
            </form>

            <p className="text-center text-sm text-night-gray-600 mt-7">
              Not a {loginType}?{' '}
              <Link to="/vendor-signup" className="text-night-red-600 font-semibold hover:underline">
                Sign up as a {loginType === 'partner' ? 'Partner' : 'Rider'}
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Link to="/terms" className="text-sm text-night-red-600 absolute right-8 bottom-8 hover:underline">
        Terms of Service
      </Link>
    </div>
  );
};

export default VendorSignIn;

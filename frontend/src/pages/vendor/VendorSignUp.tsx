import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import vendorSignUpImage from '../../assets/signin-image.png';
import { BUSINESS_TYPES, createVendorAccount, createRiderAccount, toErrorMessage } from '../../services/api';

type SignUpType = 'partner' | 'rider';

interface FormData {
  firstName: string;
  lastName: string;
  businessType: string;
  vehicleType: string;
  phoneNumber: string;
  email: string;
  location: string;
  password: string;
  agreeToPolicy: boolean;
}

const VEHICLE_TYPES = ['Bicycle', 'Bike', 'Car', 'Van'];

const VendorSignUp: React.FC = () => {
  const navigate = useNavigate();
  const [signUpType, setSignUpType] = useState<SignUpType>('partner');
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    businessType: '',
    vehicleType: '',
    phoneNumber: '',
    email: '',
    location: '',
    password: '',
    agreeToPolicy: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (signUpType === 'partner' && !formData.businessType.trim()) {
      setErrorMessage('Please enter a business type.');
      return;
    }

    if (signUpType === 'rider' && !formData.vehicleType.trim()) {
      setErrorMessage('Please select a vehicle type.');
      return;
    }

    if (!formData.location.trim()) {
      setErrorMessage('Please enter your location.');
      return;
    }

    if (!formData.password.trim()) {
      setErrorMessage('Please enter a password.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (signUpType === 'partner') {
        const result = await createVendorAccount({
          firstName: formData.firstName,
          lastName: formData.lastName,
          businessType: formData.businessType,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          location: formData.location,
          password: formData.password,
        });
        navigate('/vendor-kyc', {
          state: {
            userId: result.vendor.id,
            firstName: result.vendor.firstName,
            lastName: result.vendor.lastName,
          },
        });
      } else {
        const result = await createRiderAccount({
          firstName: formData.firstName,
          lastName: formData.lastName,
          vehicleType: formData.vehicleType,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          location: formData.location,
          password: formData.password,
        });
        navigate('/rider-kyc', {
          state: {
            userId: result.rider.id,
            firstName: result.rider.firstName,
            lastName: result.rider.lastName,
          },
        });
      }
    } catch (err) {
      setErrorMessage(toErrorMessage(err, 'Error occurred during signup.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-poppins flex flex-col">
      <header className="w-full max-w-[1400px] mx-auto flex items-center justify-between px-3 sm:px-5 md:px-6 pt-6 pb-4">
        <Link to="/" className="block">
          <img
            src={logo}
            alt="Night Crawlers"
            className="h-16 sm:h-20 w-auto object-contain"
            style={{ transform: 'scale(2.5)', transformOrigin: 'left center' }}
          />
        </Link>
        <p className="text-sm text-night-gray-700">
          Already {signUpType === 'partner' ? 'a partner' : 'a rider'}?{' '}
          <Link to="/vendor-signin" className="text-[#C62222] font-semibold hover:underline">
            Log In
          </Link>
        </p>
      </header>

      <main className="w-full max-w-[1400px] mx-auto flex-1 px-3 sm:px-5 md:px-6 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-5 md:gap-8 items-stretch">
          <div className="bg-[#f7f7f7] border border-[#e8e8e8] rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.05)] px-6 sm:px-7 md:px-8 py-8 md:py-9 h-full">

            <div className="flex flex-col gap-4 mb-6">
              <h1 className="text-2xl font-semibold text-[#C62222] text-center">
                {signUpType === 'partner' ? 'Become a Partner' : 'Become a Rider'}
              </h1>

              <div className="flex p-1 bg-white border border-gray-200 rounded-lg w-full max-w-[300px] mx-auto">
                <button
                  type="button"
                  onClick={() => setSignUpType('partner')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${signUpType === 'partner'
                    ? 'bg-night-red-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                  Partner
                </button>
                <button
                  type="button"
                  onClick={() => setSignUpType('rider')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${signUpType === 'rider'
                    ? 'bg-night-red-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                  Rider
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-night-gray-700">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="First name"
                    className="w-full h-11 px-3 border border-[#d8d8d8] rounded-sm text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-[#C62222] transition"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-night-gray-700">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Last name"
                    className="w-full h-11 px-3 border border-[#d8d8d8] rounded-sm text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-[#C62222] transition"
                    required
                  />
                </div>
              </div>

              {signUpType === 'partner' ? (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-night-gray-700">Business Type</label>
                  <input
                    type="text"
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    placeholder="Business type"
                    list="businessTypeOptions"
                    className="w-full h-11 px-3 border border-[#d8d8d8] rounded-sm text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-[#C62222] transition"
                    required
                  />
                  <datalist id="businessTypeOptions">
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-night-gray-700">Vehicle Type</label>
                  <input
                    type="text"
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleInputChange}
                    placeholder="Select vehicle type"
                    list="vehicleTypeOptions"
                    className="w-full h-11 px-3 border border-[#d8d8d8] rounded-sm text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-[#C62222] transition"
                    required
                  />
                  <datalist id="vehicleTypeOptions">
                    {VEHICLE_TYPES.map((type) => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-night-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="Phone Number"
                    className="w-full h-11 px-3 border border-[#d8d8d8] rounded-sm text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-[#C62222] transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-night-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="you@gmail.com"
                    className="w-full h-11 px-3 border border-[#d8d8d8] rounded-sm text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-[#C62222] transition"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-night-gray-700">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a password"
                    className="w-full h-11 px-3 border border-[#d8d8d8] rounded-sm text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-[#C62222] transition"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-night-gray-700">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Location"
                  className="w-full h-11 px-3 border border-[#d8d8d8] rounded-sm text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C62222] focus:border-[#C62222] transition"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-night-gray-600 select-none">
                <input
                  type="checkbox"
                  name="agreeToPolicy"
                  checked={formData.agreeToPolicy}
                  onChange={handleInputChange}
                  className="w-4 h-4 border border-[#d8d8d8] rounded-sm focus:ring-[#C62222]"
                />
                <span>
                  You agree to our friendly{' '}
                  <Link to="/privacy-policy" className="text-[#C62222] font-medium hover:underline">
                    privacy policy
                  </Link>
                </span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-[#C62222] text-white rounded-sm font-semibold shadow-sm hover:bg-[#aa1c1c] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating account...' : 'Get Started'}
              </button>
              {errorMessage && (
                <p className="text-xs text-[#C62222]" role="alert">
                  {errorMessage}
                </p>
              )}
            </form>
          </div>

          <div className="hidden lg:flex w-full h-full relative">
            <img
              src={vendorSignUpImage}
              alt="Vendor sign up"
              className="absolute inset-0 w-full h-full object-cover rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.05)] border border-[#e8e8e8]"
            />
          </div>
        </div>

        <div className="mt-6 text-right">
          <Link to="/terms" className="text-[#C62222] text-sm underline">
            Terms of Service
          </Link>
        </div>
      </main>
    </div>
  );
};

export default VendorSignUp;
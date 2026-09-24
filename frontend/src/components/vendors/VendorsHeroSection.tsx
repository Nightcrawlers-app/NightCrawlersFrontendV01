import React from 'react';
import { useNavigate } from 'react-router-dom';
import vendorsHeroImage from '../../assets/vendors-hero.png';

const VendorsHeroSection: React.FC = () => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    navigate('/vendor-signup');
  };

  const handleContinueShopping = () => {
    navigate('/vendor-signin');
  };

  return (
    <section className="relative w-full bg-white pt-[30px] sm:pt-[35px] md:pt-[40px] pb-[30px] sm:pb-[35px] md:pb-[40px]">
      {/* Breadcrumb/Tag */}
      <div className="flex justify-center mb-[32px] sm:mb-[40px] md:mb-[48px] px-4">
        <div className="flex items-center justify-center px-[8px] sm:px-[10px] py-[6px] sm:py-[8px] gap-[8px] sm:gap-[10px] bg-[rgba(46,61,134,0.05)] border border-[#EAECF0] rounded-full w-fit">
          <span className="text-[#363838] font-poppins font-normal text-[14px] sm:text-[16px] md:text-[18px] leading-[20px] sm:leading-[24px] md:leading-[27px]">
            Become a Partner
          </span>
        </div>
      </div>

      {/* Main Hero Content */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-[60px] md:gap-[100px] lg:gap-[171px] max-w-[1440px] mx-auto px-[20px] sm:px-[30px] md:px-[37px] mb-[60px] sm:mb-[80px] md:mb-[100px]">

        {/* Left Content */}
        <div className="flex flex-col items-start gap-[32px] sm:gap-[40px] md:gap-[48px] flex-1 max-w-[570px]">

          {/* Heading */}
          <h1 className="font-poppins font-semibold text-[28px] sm:text-[36px] md:text-[48px] leading-[120%] tracking-[-0.02em] text-[#222222]">
            Partner with us and Become a Vendor
          </h1>

          {/* Description */}
          <p className="font-poppins font-normal text-[16px] sm:text-[18px] md:text-[20px] leading-[120%] tracking-[-0.02em] text-[#222222] max-w-[570px]">
            Join thousands of restaurants, supermarkets, beauty stores and pharmacies reaching millions of customers daily on Night Crawlers.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-[24px] sm:gap-[32px] md:gap-[40px] w-full">

            {/* Primary CTA */}
            <button
              onClick={handleSignUp}
              className="flex items-center justify-center px-[10px] py-[10px] gap-[10px] w-full sm:w-[191px] h-[40px] sm:h-[41px] bg-[#C62222] rounded-[4px] hover:bg-red-700 transition-all duration-200"
            >
              <span className="font-poppins font-medium text-[14px] leading-[21px] text-[#FCFCFC]">
                Sign up as a Partner
              </span>
            </button>

            {/* Secondary CTA */}
            <button
              onClick={handleContinueShopping}
              className="flex items-center justify-center w-full sm:w-[138px] h-[40px] sm:h-[41px] bg-white border border-[#C62222] rounded-[4px] text-[#C62222] font-poppins font-medium text-[14px] leading-[21px] transition-all duration-200 hover:bg-red-700 hover:border-red-700 hover:text-white"
            >
              Log In
            </button>
          </div>
        </div>

        {/* Right Image */}
        <div className="relative flex-1 max-w-[590px] w-full">
          <div className="relative w-full h-[280px] sm:h-[350px] md:h-[420px] lg:h-[515px] overflow-hidden">
            <img
              src={vendorsHeroImage}
              alt="Butter chicken bowl"
              className="w-full h-full object-cover object-left"
            />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[48px] sm:h-[64px] md:h-[80px] bg-white" />
          </div>
        </div>
      </div>

      {/* Underline Accent */}
      <div className="flex justify-center mb-[60px] sm:mb-[80px] md:mb-[100px]">
        <div className="w-[89px] h-[12px] border-b-[2px] border-[#C62222]"></div>
      </div>
    </section>
  );
};

export default VendorsHeroSection;

import React from 'react';
import hero2Image from '../../../../.figma/image/mje7na9d-ei1m5xv.png';

const stats = [
  { value: '500+', label: 'Vendors' },
  { value: '15min', label: 'Avg delivery' },
  { value: '24/7', label: 'Always open' },
];

const IntroSection: React.FC = () => {
  return (
    <section className="flex flex-col items-center w-full max-w-[1386px] mx-auto gap-10 lg:gap-14 py-10 lg:py-14 px-4">
      <div className="flex flex-col lg:flex-row items-center justify-between w-full px-4 lg:px-8 gap-8 lg:gap-[100px]">
        <div className="flex flex-col items-start gap-5 lg:gap-6 w-full lg:w-[560px]">
          <h2 className="text-[#222222] text-[26px] sm:text-[32px] lg:text-[40px] font-semibold leading-[34px] sm:leading-[40px] lg:leading-[48px] tracking-[-0.02em] font-poppins m-0">
            Redefining convenience, one delivery at a time.
          </h2>
          <p className="text-[#667085] text-[14px] sm:text-[16px] leading-[20px] sm:leading-[24px] tracking-[-0.02em] font-poppins m-0">
            Trusted vendors, fast riders, and an app built around late-night cravings and everyday needs.
          </p>
          <div className="flex items-center gap-6 sm:gap-10 pt-2">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <span className="text-[#C62222] text-[22px] sm:text-[28px] font-bold leading-none">{stat.value}</span>
                <span className="text-[#667085] text-[12px] sm:text-[13px] mt-1">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
        <img
          src={hero2Image}
          alt="Delicious meal plate"
          className="w-full max-w-[320px] lg:w-[420px] h-auto object-contain flex-shrink-0"
        />
      </div>
    </section>
  );
};

export default IntroSection;
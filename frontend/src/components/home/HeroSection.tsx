import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const HeroSection: React.FC = () => {
  return (
    <section className="flex flex-col items-center w-full max-w-[1032px] mx-auto gap-6 sm:gap-8 mt-8 sm:mt-10 lg:mt-12 px-4">      <h1 className="text-[#222222] text-[32px] sm:text-[40px] lg:text-[48px] font-semibold leading-[40px] sm:leading-[52px] lg:leading-[58px] tracking-[-0.02em] text-center font-poppins m-0 max-w-[729px]">
        Every Delivery to your Doorstep
      </h1>
        <p className="text-[#667085] text-[15px] sm:text-[18px] leading-[22px] sm:leading-[26px] tracking-[-0.02em] text-center font-poppins w-full max-w-[560px] m-0 px-4 sm:px-0">
          Food, groceries, and more — delivered fast, any hour of the night.
        </p>
      <div className="flex items-center justify-center">
        <Link to="/explore" className="inline-flex items-center gap-2 bg-[#C62222] text-white text-[15px] sm:text-[16px] font-semibold font-poppins px-6 py-3 rounded-[8px] shadow-sm hover:bg-[#A01B1B] active:scale-[0.98] transition-all whitespace-nowrap">
          Explore Categories
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={3} />
        </Link>
      </div>
    </section>
  );
};

export default HeroSection;

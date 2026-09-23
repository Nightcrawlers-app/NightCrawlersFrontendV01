import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import instagramIcon from '../../../../.figma/image/mje8ir02-k02ewke.png';
import whatsappIcon from '../../../../.figma/image/mje8ir02-wrgzyap.png';
import facebookIcon from '../../../../.figma/image/mje8iqzx-1n4d3p5.png';

const Footer: React.FC = () => {
  return (
    <footer className="flex flex-col items-center bg-[#222222] w-full min-h-[272px] overflow-hidden pb-0">
      <div className="flex flex-col lg:flex-row items-start justify-between w-full max-w-[1467px] px-4 sm:px-6 md:px-[26px] lg:px-[26px] xl:pr-[48px] pt-8 lg:pt-10">
        <div className="flex flex-col items-start gap-2 mb-8 lg:mb-0 lg:w-[281px]">
          <div className="overflow-hidden h-[100px] sm:h-[110px] md:h-[120px] lg:h-[130px]">
            <img
              src={logo}
              alt="Night Crawlers"
              className="w-[180px] sm:w-[200px] md:w-[220px] lg:w-[240px] h-auto object-contain -mt-8"
            />
          </div>
          <p className="text-[14px] leading-[20px] tracking-normal text-white font-poppins max-w-[280px]">
            Get your favorite meals delivered fast, fresh, and right to your door.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-8 sm:gap-12 md:gap-16 lg:gap-[32px] w-full lg:w-[681px]">
          <div className="flex flex-col flex-grow items-start gap-[10px] lg:w-[205px]">
            <p className="text-[#98A2B3] text-[14px] leading-[20px] font-semibold tracking-normal font-night-sans m-0 w-full">Product</p>
            <div className="flex flex-col items-start gap-[6px] w-full">
              <Link to="/overview" className="text-[#E4E7EC] text-[16px] leading-[24px] font-medium tracking-normal font-night-sans hover:text-night-green-400 transition-colors">Overview</Link>
              <Link to="/features" className="text-[#E4E7EC] text-[16px] leading-[24px] font-medium tracking-normal font-night-sans hover:text-night-green-400 transition-colors">Features</Link>
            </div>
          </div>
          <div className="flex flex-col flex-grow items-start gap-[10px] lg:w-[205px]">
            <p className="text-[#98A2B3] text-[14px] leading-[20px] font-semibold tracking-normal font-night-sans m-0 w-full">Company</p>
            <div className="flex flex-col items-start gap-[6px] w-full">
              <Link to="/about" className="text-[#E4E7EC] text-[16px] leading-[24px] font-medium tracking-normal font-night-sans hover:text-night-green-400 transition-colors">About us</Link>
              <Link to="/contact" className="text-[#E4E7EC] text-[16px] leading-[24px] font-medium tracking-normal font-night-sans hover:text-night-green-400 transition-colors">Contact</Link>
            </div>
          </div>
          <div className="flex flex-col flex-grow items-start gap-[10px] lg:w-[205px]">
            <p className="text-[#98A2B3] text-[14px] leading-[20px] font-semibold tracking-normal font-night-sans m-0 w-full">Legal</p>
            <div className="flex flex-col items-start gap-[6px] w-full">
              <Link to="/terms" className="text-[#E4E7EC] text-[16px] leading-[24px] font-medium tracking-normal font-night-sans hover:text-night-green-400 transition-colors">Terms</Link>
              <Link to="/privacy" className="text-[#E4E7EC] text-[16px] leading-[24px] font-medium tracking-normal font-night-sans hover:text-night-green-400 transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-[#C62222] mt-[61px] rounded-b-[4px]">
        <div className="flex flex-row items-center justify-between w-full max-w-[1467px] mx-auto px-4 sm:px-[41px] py-[10px] overflow-hidden">
          <p className="text-white text-[14px] sm:text-[16px] md:text-[18px] leading-[24px] sm:leading-[30px] tracking-normal font-poppins m-0 w-auto">
            2026 Night Crawlers Inc.
          </p>
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
            <img src={instagramIcon} alt="Instagram" className="w-[25px] h-[25px] sm:w-[28px] sm:h-[28px] md:w-[30px] md:h-[30px]" />
            <img src={whatsappIcon} alt="WhatsApp" className="w-[25px] h-[25px] sm:w-[28px] sm:h-[28px] md:w-[30px] md:h-[30px]" />
            <img src={facebookIcon} alt="Facebook" className="w-[25px] h-[25px] sm:w-[28px] sm:h-[28px] md:w-[30px] md:h-[30px]" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

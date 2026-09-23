import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

import kfcImg from '../../../../.figma/image/mje79tfs-ebqiolr.png';
import chickenRepublicImg from '../../../../.figma/image/mje79tft-mnpk82m.png';
import dominosImg from '../../../../.figma/image/mje79tfy-zdt3g00.png';
import kilimanjaroImg from '../../../../.figma/image/mje79tfy-vnfduy8.png';
import pizzaHutImg from '../../../../.figma/image/mje79tfy-l6ekoeg.png';

const VendorShowcase: React.FC = () => {
  return (
    <section className="flex flex-col items-center w-full max-w-[1386px] mx-auto gap-10 lg:gap-14 py-10 lg:py-14 px-4">
      <div className="flex flex-col sm:flex-row items-center justify-between w-full px-4 lg:px-8 gap-4">
        <h2 className="text-[#222222] text-2xl sm:text-3xl lg:text-[32px] font-semibold leading-[32px] sm:leading-[40px] lg:leading-[40px] tracking-normal font-poppins w-full sm:w-auto text-center sm:text-left">
          Order Tasty Meals through us
        </h2>
        <Link
          to="/explore"
          className="flex items-center gap-2 text-[#c62222] text-[16px] sm:text-[18px] lg:text-[20px] font-semibold leading-[24px] lg:leading-[30px] tracking-normal font-poppins hover:underline whitespace-nowrap"
        >
          Explore all Restaurants
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={3} />
        </Link>
      </div>

      <div className="flex flex-col items-center w-full gap-12 lg:gap-[60px]">
        {/* Row 1: KFC, Chicken Republic, Dominos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-[274px] w-full justify-items-center">
          <div className="flex flex-col items-center gap-4 lg:gap-[14px]">
            <div className="w-32 h-36 sm:w-40 sm:h-44 lg:w-[158px] lg:h-[167px] overflow-hidden shadow-sm hover:scale-105 transition-transform duration-300">
              <img src={kfcImg} alt="KFC" className="w-full h-full object-cover" />
            </div>
            <p className="text-[#c62222] text-lg sm:text-xl lg:text-[24px] font-medium leading-[30px] lg:leading-[36px] tracking-normal font-poppins m-0 text-center">
              KFC
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 lg:gap-[14px]">
            <div className="w-32 h-36 sm:w-40 sm:h-44 lg:w-[158px] lg:h-[167px] overflow-hidden shadow-sm hover:scale-105 transition-transform duration-300">
              <img src={chickenRepublicImg} alt="Chicken Republic" className="w-full h-full object-cover" />
            </div>
            <p className="text-[#c62222] text-lg sm:text-xl lg:text-[24px] font-medium leading-[30px] lg:leading-[36px] tracking-normal font-poppins m-0 text-center">
              Chicken Republic
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 lg:gap-[14px]">
            <div className="w-32 h-36 sm:w-40 sm:h-44 lg:w-[158px] lg:h-[167px] overflow-hidden shadow-sm hover:scale-105 transition-transform duration-300">
              <img src={dominosImg} alt="Dominos Pizza" className="w-full h-full object-cover" />
            </div>
            <p className="text-[#c62222] text-lg sm:text-xl lg:text-[24px] font-medium leading-[30px] lg:leading-[36px] tracking-normal font-poppins m-0 text-center">
              Dominos Pizza
            </p>
          </div>
        </div>

        {/* Row 2: Kilimanjaro, Pizza Hut */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8 lg:gap-[274px] w-full max-w-2xl lg:max-w-none justify-items-center">
          <div className="flex flex-col items-center gap-4 lg:gap-[14px]">
            <div className="w-32 h-36 sm:w-40 sm:h-44 lg:w-[158px] lg:h-[167px] overflow-hidden shadow-sm hover:scale-105 transition-transform duration-300">
              <img src={kilimanjaroImg} alt="Killimanjaro" className="w-full h-full object-cover" />
            </div>
            <p className="text-[#c62222] text-lg sm:text-xl lg:text-[24px] font-medium leading-[30px] lg:leading-[36px] tracking-normal font-poppins m-0 text-center">
              Killimanjaro
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 lg:gap-[14px]">
            <div className="w-32 h-36 sm:w-40 sm:h-44 lg:w-[158px] lg:h-[167px] overflow-hidden shadow-sm hover:scale-105 transition-transform duration-300">
              <img src={pizzaHutImg} alt="Pizza Hut" className="w-full h-full object-cover" />
            </div>
            <p className="text-[#c62222] text-lg sm:text-xl lg:text-[24px] font-medium leading-[30px] lg:leading-[36px] tracking-normal font-poppins m-0 text-left sm:text-center">
              Pizza Hut
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VendorShowcase;

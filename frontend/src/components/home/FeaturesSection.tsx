import React from 'react';
import phoneIcon from '../../../../.figma/image/mje8rtgf-vds6a68.png';
import deliveryIcon from '../../../../.figma/image/mje8rtgg-bjjwlgu.png';
import qualityIcon from '../../../../.figma/image/mje8rtgg-m4cr5j7.png';

const features = [
  { icon: phoneIcon, title: 'Easy to Order', desc: 'Browse, tap, done — in under a minute.' },
  { icon: deliveryIcon, title: 'Fast Delivery', desc: 'Riders nearby, tracked live to your door.' },
  { icon: qualityIcon, title: 'Best Quality', desc: 'Vetted vendors, checked every order.' },
];

const FeaturesSection: React.FC = () => {
  return (
    <section className="flex flex-col items-center w-full max-w-[1388px] mx-auto gap-10 lg:gap-14 py-10 lg:py-14 px-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 items-start w-full gap-8 sm:gap-6">
        {features.map((f) => (
          <div key={f.title} className="flex flex-col items-center text-center px-2">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#e7575742] p-3 mb-4">
              <img src={f.icon} alt={f.title} className="w-9 h-9 object-contain" />
            </div>
            <h3 className="text-[#222222] text-[17px] font-semibold leading-tight font-poppins m-0">
              {f.title}
            </h3>
            <p className="text-[#667085] text-[13px] leading-[18px] font-poppins text-center mt-1.5">
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
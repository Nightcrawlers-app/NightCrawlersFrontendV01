import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { CATEGORY_DISPLAY } from '../../config/categories';

/**
 * "What do you need tonight?" — the five categories right under the hero, so
 * visitors see the full range (not just food) the moment they land.
 */
const CategoryStrip: React.FC = () => (
  <section className="w-full max-w-[1200px] mx-auto px-4 pt-8 sm:pt-12">
    <h2 className="text-center text-[#222222] text-[20px] sm:text-[24px] font-semibold font-poppins mb-5 sm:mb-7">
      What do you need tonight?
    </h2>
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {CATEGORY_DISPLAY.map((c) => (
        <li key={c.type} className={c.type === 'Clubs/Lounges' ? 'col-span-2 sm:col-span-1' : ''}>
          <Link
            to={`/explore?category=${encodeURIComponent(c.type)}`}
            className="group h-full flex items-center gap-3 sm:flex-col sm:items-center sm:text-center p-3 sm:p-5 rounded-2xl border border-[#EAECF0] bg-white hover:border-[#E00B0B] hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E00B0B]"
          >
            <span className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#FFF5F5] flex items-center justify-center group-hover:scale-105 transition-transform">
              <img src={c.icon} alt="" className="w-7 h-7 sm:w-9 sm:h-9 object-contain" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 sm:justify-center text-[15px] sm:text-[16px] font-semibold text-[#222222] font-poppins">
                {c.label}
                <ChevronRight size={14} className="text-[#E00B0B] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </span>
              <span className="block text-[12px] sm:text-[13px] text-[#667085] leading-snug mt-0.5">{c.tagline}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </section>
);

export default CategoryStrip;

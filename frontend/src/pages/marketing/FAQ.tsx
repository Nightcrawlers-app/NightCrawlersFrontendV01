import React, { useState } from 'react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

import minusIcon from '../../assets/faq/minus.png';
import plusIcon from '../../assets/faq/plus.png';
import aboutIcon from '../../assets/faq/about2.png';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    id: 0,
    question: 'What is Night Crawlers?',
    answer: 'Night Crawlers is a fast delivery platform connecting customers with restaurants, supermarkets, beauty stores and pharmacies.',
    category: 'General Information'
  },
  {
    id: 1,
    question: 'How do I place an order?',
    answer: 'You can place an order through our mobile app or website. Simply browse available vendors, select your items, and proceed to checkout.',
    category: 'General Information'
  },
  {
    id: 2,
    question: 'What are your delivery fees?',
    answer: 'Delivery fees vary based on distance and order amount. You can see the exact fee before confirming your order.',
    category: 'Purchasing & Payment'
  },
  {
    id: 3,
    question: 'What payment methods do you accept?',
    answer: 'We accept credit cards, debit cards, mobile money, and cash on delivery depending on your location.',
    category: 'Purchasing & Payment'
  }
];

const categories = ['General Information', 'Purchasing & Payment', 'Customer Support', 'Resources'];

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('General Information');

  const filteredFAQs = faqData.filter(faq => faq.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white flex flex-col font-poppins overflow-x-hidden">
      <Header />

      <main className="flex-grow w-full bg-white px-4 sm:px-6 md:px-[40px] pt-[1%] pb-[40px] sm:pb-[56px]">
        <div className="max-w-[1440px] mx-auto">
          {/* FAQ Title Section */}
          <div className="flex flex-col items-center justify-center gap-[20px] sm:gap-[25px] md:gap-[30px] text-center mb-[36px] sm:mb-[48px]">
            <div className="inline-flex items-center justify-center gap-[8px] sm:gap-[10px] border border-[#EAECF0] rounded-[50px] bg-[rgba(46,61,134,0.05)] px-[12px] sm:px-[16px] py-[8px] sm:py-[10px]">
              <p className="leading-[22px] sm:leading-[25px] md:leading-[27px] text-[#363838] text-[14px] sm:text-[16px] md:text-[18px]">FAQs</p>
            </div>
            <h1 className="leading-[120%] tracking-[-0.02em] text-[#222222] text-[28px] sm:text-[36px] md:text-[48px] font-semibold max-w-[800px]">
              Questions we Frequently get
            </h1>
            <p className="leading-[22px] sm:leading-[26px] text-[#667085] text-[14px] sm:text-[16px] max-w-[500px]">
              Quick answers to what people ask us most.
            </p>
          </div>

          {/* Content Container */}
          <div className="flex flex-col lg:flex-row gap-[30px] lg:gap-[60px] w-full">
            {/* Left - Categories Sidebar */}
            <div className="flex flex-col items-start gap-[24px] lg:gap-[40px] w-full lg:w-[307px] lg:sticky lg:top-[80px] lg:h-fit">
              <h2 className="text-[#C62222] text-[20px] lg:text-[24px] font-semibold leading-[20px] lg:leading-[24px]">Categories</h2>
              <div className="flex flex-row lg:flex-col gap-[12px] lg:gap-[16px] w-full lg:w-[307px] overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setOpenIndex(null);
                    }}
                    className={`h-[40px] lg:h-[41px] px-[14px] lg:px-[17px] leading-[20px] lg:leading-[24px] text-[14px] lg:text-[16px] text-left transition-all duration-200 whitespace-nowrap flex-shrink-0 ${selectedCategory === category
                        ? 'font-medium text-[#222222] border-l-[3px] border-[#C62222] bg-[rgba(198,34,34,0.05)]'
                        : 'font-normal text-[#667085] border-l-[3px] border-transparent hover:bg-gray-50'
                      }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Right - FAQ Accordion */}
            <div className="flex flex-col gap-[20px] lg:gap-[30px] w-full lg:flex-1">
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((faq, idx) => (
                  <div
                    key={faq.id}
                    onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                    className={`rounded-[8px] px-[16px] lg:px-[20px] py-[16px] lg:py-[20px] cursor-pointer transition-all duration-200 ${openIndex === idx
                        ? 'border-[1px] border-[#C62222] bg-white shadow-sm'
                        : 'bg-[rgba(234,236,240,0.42)] border border-transparent hover:bg-[rgba(234,236,240,0.6)]'
                      }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <p className={`text-[14px] lg:text-[16px] leading-[22px] lg:leading-[26px] pr-4 ${openIndex === idx ? 'font-medium text-[#222222]' : 'font-normal text-[#101828]'
                        }`}>
                        {faq.question}
                      </p>
                      <div className="flex items-center justify-center rounded-full bg-[#EAECF0] w-[20px] h-[20px] lg:w-[24px] lg:h-[24px] flex-shrink-0 ml-2">
                        <img
                          src={openIndex === idx ? minusIcon : plusIcon}
                          alt="toggle"
                          className="w-[10px] h-[10px] lg:w-[12px] lg:h-[12px]"
                        />
                      </div>
                    </div>
                    {openIndex === idx && (
                      <p className="mt-[12px] lg:mt-[16px] text-[13px] lg:text-[14px] leading-[18px] lg:leading-[20px] text-[#667085]">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-[40px] text-[#667085] text-[16px]">
                  No FAQs found in this category.
                </div>
              )}
            </div>
          </div>

          {/* Support Section */}
          <div className="mt-[80px] lg:mt-[100px] flex flex-col lg:flex-row items-center justify-between gap-[30px] lg:gap-[40px]">
            <div className="flex flex-col gap-[12px] text-center lg:text-left">
              <div className="inline-flex items-center justify-center lg:justify-start gap-[16px]">
                <img src={aboutIcon} alt="help icon" className="w-[24px] h-[24px]" />
                <p className="text-[#222222] text-[20px] font-medium leading-[30px]">Still have a question?</p>
              </div>
              <p className="leading-[18px] text-[#667085] text-[14px]">If you didn't find your answer, feel free to reach out.</p>
              <a
                href="/contact"
                className="inline-flex items-center justify-center lg:justify-start leading-[24px] text-[#C62222] text-[16px] underline hover:no-underline transition-all duration-200"
              >
                Contact us
              </a>
            </div>

            {/* Decorative underline */}
            <div className="hidden lg:block w-[60px] h-[2px] border-t-[2px] border-[#C62222]"></div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;

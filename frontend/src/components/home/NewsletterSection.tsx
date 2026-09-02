import React, { useState } from 'react';
import { NewsletterForm } from '../../types';
import { subscribeToNewsletter, toErrorMessage } from '../../services/api';
import subscribeImage from '../../../../.figma/image/mje7taht-9jmjknp.png';

const NewsletterSection: React.FC = () => {
  const [formData, setFormData] = useState<NewsletterForm>({
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ email: e.target.value });
    setMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage('');
    setIsError(false);
    try {
      await subscribeToNewsletter(formData.email);
      setFormData({ email: '' });
      setMessage("Thanks, you're on the list.");
    } catch (error) {
      setIsError(true);
      setMessage(toErrorMessage(error, "Couldn't subscribe you just now. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex justify-center w-full py-10 px-4">
      <div className="flex flex-col lg:flex-row items-center lg:justify-between w-full max-w-[1362px] min-h-[442px] bg-[rgba(249,250,251,0.05)] border border-[#EAECF0] rounded-[10px] shadow-[4px_4px_15px_2px_rgba(168,166,166,0.32)] px-4 sm:px-6 md:px-8 lg:px-[29px] py-8 gap-8 lg:gap-[80px]">
        <div className="flex flex-col items-start gap-4 w-full lg:w-[470px] text-left">
          <h2 className="text-[#222222] text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[36px] sm:leading-[44px] lg:leading-[58px] tracking-[-0.02em] font-poppins m-0">
            Exclusive Menus & Promotions
          </h2>
          <p className="text-[#222222] text-[14px] sm:text-[16px] leading-[18px] sm:leading-[19px] tracking-[-0.02em] font-poppins m-0">
            Join the Night Crawlers tribe! Be the first to know about fresh deals, new food spots, and exclusive night-time treats.
          </p>

          <form onSubmit={handleSubmit} className="w-full max-w-[470px]">
            <div className="flex items-center w-full">
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="h-[40px] flex-1 px-4 bg-white border border-[#D0D5DD] rounded-l-[4px] shadow-[0px_1px_2px_rgba(16,24,40,0.05)] outline-none text-[#667085] text-[14px] sm:text-[16px] font-poppins placeholder:text-[#667085] min-w-0"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-[40px] w-[103px] -ml-px bg-[#C62222] text-white text-[14px] sm:text-[16px] font-medium font-poppins rounded-r-[4px] hover:bg-[#A01B1B] transition-colors disabled:opacity-70 shrink-0"
              >
                {isSubmitting ? '...' : 'Subscribe'}
              </button>
            </div>

            {message && (
              <p
                className={`mt-2 text-[13px] font-poppins ${isError ? 'text-[#991B1B]' : 'text-[#067647]'}`}
                role="status"
              >
                {message}
              </p>
            )}
          </form>
        </div>

        <img
          src={subscribeImage}
          alt="Delivery person"
          className="w-full max-w-[320px] sm:max-w-[360px] lg:max-w-[442px] h-auto lg:h-[442px] object-contain"
        />
      </div>
    </section>
  );
};

export default NewsletterSection;

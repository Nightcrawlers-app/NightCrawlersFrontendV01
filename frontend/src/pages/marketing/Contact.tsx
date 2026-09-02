import React, { useState } from 'react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { sendContactMessage, toErrorMessage } from '../../services/api';

const EMPTY_FORM = { firstName: '', lastName: '', email: '', message: '' };

const Contact: React.FC = () => {
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState('');
    const [isError, setIsError] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setStatus('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        setStatus('');
        setIsError(false);
        try {
            await sendContactMessage(formData);
            setFormData(EMPTY_FORM);
            setStatus("Thanks, we've got your message. We'll be in touch shortly.");
        } catch (error) {
            setIsError(true);
            setStatus(toErrorMessage(error, "Couldn't send your message just now. Please try again."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-poppins overflow-x-hidden">
            <Header />

            <main className="flex-1 w-full max-w-[1440px] mx-auto pt-0 relative flex flex-col items-start">

                {/* Title Section */}
                <div className="w-full px-4 sm:px-6 lg:px-[32px] mt-8 mb-8 lg:mb-12">
                    <div className="flex flex-col items-start gap-4 lg:gap-5 max-w-3xl">
                        <div className="flex flex-col items-start gap-3">
                            <p className="text-[#C62222] text-base font-semibold leading-normal font-poppins">Contact us</p>
                            <h1 className="text-[#101828] text-[24px] sm:text-4xl lg:text-5xl font-semibold leading-tight tracking-tight font-poppins">
                                Chat to our friendly team
                            </h1>
                        </div>
                        <p className="text-[#667085] text-lg sm:text-xl leading-relaxed font-poppins">
                            Weƒ?Td love to hear from you. Please fill out this form or shoot us an email.
                        </p>
                    </div>
                </div>

                {/* Main Content Container */}
                <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16 px-4 sm:px-6 lg:px-[32px] w-full mb-16">
                    {/* Left Content - Contact Information */}
                    <div className="flex flex-col grow items-start gap-[48px] w-full">
                        {/* Email and Live Chat Row */}
                        <div className="flex flex-col sm:flex-row items-start self-stretch gap-[32px]">
                            {/* Email Contact */}
                            <div className="flex flex-col grow items-start gap-[16px]">
                                <div className="w-[24px] h-[24px] bg-white rounded-full flex items-center justify-center">
                                    <Mail className="w-[20px] h-[16px] text-[#C62222]" />
                                </div>
                                <div className="flex flex-col items-start self-stretch gap-[8px]">
                                    <p className="text-[#101828] text-[20px] font-medium leading-[30px] font-poppins">Email</p>
                                    <p className="text-[#667085] text-[16px] leading-[24px] font-poppins">Our friendly team is here to help.</p>
                                </div>
                                <a href="mailto:help@nightcrawlers.com" className="text-[#C62222] text-[16px] font-medium leading-[24px] font-poppins hover:underline">help@nightcrawlers.com</a>
                            </div>

                            {/* Live Chat Contact */}
                            <div className="flex flex-col grow items-start gap-[16px]">
                                <div className="w-[24px] h-[24px] bg-white rounded-full flex items-center justify-center">
                                    <MessageCircle className="w-[18px] h-[18px] text-[#C62222]" />
                                </div>
                                <div className="flex flex-col items-start self-stretch gap-[8px]">
                                    <p className="text-[#101828] text-[20px] font-medium leading-[30px] font-poppins">Live chat</p>
                                    <p className="text-[#667085] text-[16px] leading-[24px] font-poppins">Our friendly team is here to help.</p>
                                </div>
                                <a href="#" className="text-[#C62222] text-[16px] font-medium leading-[24px] font-poppins hover:underline">Start new chat</a>
                            </div>
                        </div>

                        {/* Phone Contact */}
                        <div className="flex flex-col items-start self-stretch gap-[16px]">
                            <div className="w-[24px] h-[24px] bg-white rounded-full flex items-center justify-center">
                                <Phone className="w-[20px] h-[16px] text-[#C62222]" />
                            </div>
                            <div className="flex flex-col items-start self-stretch gap-[8px]">
                                <p className="text-[#101828] text-[20px] font-medium leading-[30px] font-poppins">Phone</p>
                                <p className="text-[#667085] text-[16px] leading-[24px] font-poppins">Mon-Fri from 8am to 5pm.</p>
                            </div>
                            <a href="tel:+15550000000" className="text-[#C62222] text-[16px] font-medium leading-[24px] font-poppins hover:underline">+1 (555) 000-0000</a>
                        </div>
                    </div>

                    {/* Right Form - Contact Form */}
                    <div className="flex flex-col items-center border border-[#EAECF0] rounded-[10px] bg-[#F9FAFB] px-[32px] py-[40px] gap-[64px] w-full lg:w-[583px]">
                        <form onSubmit={handleSubmit} className="flex flex-col items-start self-stretch gap-[32px] w-full">
                            <div className="flex flex-col items-start self-stretch gap-[32px] w-full">
                                {/* First Name and Last Name Row */}
                                <div className="flex flex-col sm:flex-row items-start self-stretch gap-[32px] w-full">
                                    {/* First Name */}
                                    <div className="flex flex-col items-start gap-[6px] w-full">
                                        <label htmlFor="firstName" className="text-[#344054] text-[14px] font-medium leading-[20px] font-poppins">
                                            First Name
                                        </label>
                                        <div className="flex items-center self-stretch gap-[8px] bg-white border border-[#D0D5DD] rounded-[4px] px-[16px] py-[12px] shadow-sm">
                                            <input
                                                type="text"
                                                id="firstName"
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="First name"
                                                className="flex-1 outline-none text-[16px] leading-[24px] text-gray-500 placeholder-gray-500 font-poppins"
                                            />
                                        </div>
                                    </div>

                                    {/* Last Name */}
                                    <div className="flex flex-col items-start gap-[6px] w-full">
                                        <label htmlFor="lastName" className="text-[#344054] text-[14px] font-medium leading-[20px] font-poppins">
                                            Last Name
                                        </label>
                                        <div className="flex items-center self-stretch gap-[8px] bg-white border border-[#D0D5DD] rounded-[4px] px-[16px] py-[12px] shadow-sm">
                                            <input
                                                type="text"
                                                id="lastName"
                                                name="lastName"
                                                value={formData.lastName}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Last name"
                                                className="flex-1 outline-none text-[16px] leading-[24px] text-gray-500 placeholder-gray-500 font-poppins"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="flex flex-col items-start self-stretch gap-[6px] w-full">
                                    <label htmlFor="email" className="text-[#344054] text-[14px] font-medium leading-[20px] font-poppins">
                                        Email
                                    </label>
                                    <div className="flex items-center self-stretch gap-[8px] bg-white border border-[#D0D5DD] rounded-[4px] px-[16px] py-[12px] shadow-sm">
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="you@gmail.com"
                                            className="flex-1 outline-none text-[16px] leading-[24px] text-gray-500 placeholder-gray-500 font-poppins"
                                        />
                                    </div>
                                </div>

                                {/* Message */}
                                <div className="flex flex-col items-start self-stretch h-[154px] gap-[6px] w-full">
                                    <label htmlFor="message" className="text-[#344054] text-[14px] font-medium leading-[20px] font-poppins">
                                        Message
                                    </label>
                                    <div className="flex items-start self-stretch gap-[8px] bg-white border border-[#D0D5DD] rounded-[4px] px-[16px] py-[12px] shadow-sm flex-1">
                                        <textarea
                                            id="message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="Your message..."
                                            className="flex-1 outline-none text-[16px] leading-[24px] text-gray-500 placeholder-gray-500 font-poppins resize-none h-full min-h-[120px]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex flex-col items-stretch self-stretch gap-[8px] w-full">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center self-stretch justify-center gap-[8px] border border-[#C62222] rounded-[4px] bg-[#C62222] shadow-sm px-[19px] py-[10px] sm:py-[11px] hover:bg-[#a51d1d] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <p className="text-white text-[14px] sm:text-[20px] font-medium leading-[24px] font-poppins">
                                        {isSubmitting ? 'Sending...' : 'Send message'}
                                    </p>
                                </button>

                                {status && (
                                    <p
                                        className={`text-[13px] font-poppins ${isError ? 'text-[#991B1B]' : 'text-[#067647]'}`}
                                        role="status"
                                    >
                                        {status}
                                    </p>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Contact;

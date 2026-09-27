import React from 'react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

const Terms: React.FC = () => {
    const lastUpdated = 'February 25, 2026';

    const sections = [
        {
            title: '1. Acceptance of Terms',
            content: `By accessing or using Nightcrawlers ("the Platform"), including our website and mobile applications, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. We reserve the right to modify these terms at any time, and continued use constitutes acceptance of any changes.`
        },
        {
            title: '2. Description of Service',
            content: `Nightcrawlers is an on-demand delivery platform that connects customers with local vendors including restaurants, grocery stores, pharmacies, and beauty shops. We facilitate orders, payments, and deliveries through our network of verified riders. Nightcrawlers acts as an intermediary between customers and vendors — we do not own, operate, or manage any vendor establishment.`
        },
        {
            title: '3. User Accounts',
            content: `To use certain features of the Platform, you must create an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You must provide accurate and complete information during registration and keep your account information updated. Nightcrawlers reserves the right to suspend or terminate accounts that violate these terms.`
        },
        {
            title: '4. Orders and Payments',
            content: `When you place an order through the Platform, you are making an offer to purchase products from a vendor. All prices displayed include applicable taxes unless stated otherwise. Delivery fees are calculated based on distance and displayed before checkout. Payment is required at the time of order unless "Cash on Delivery" is selected. All transactions are final once payment is processed, subject to our refund policy.`
        },
        {
            title: '5. Vendor Responsibilities',
            content: `Vendors registered on the Platform are independent businesses responsible for the quality, preparation, and accuracy of their products. Nightcrawlers does not guarantee product quality or vendor performance. Vendors must comply with all applicable food safety, health, and business regulations. Nightcrawlers reserves the right to remove vendors who fail to meet platform standards.`
        },
        {
            title: '6. Delivery Terms',
            content: `Delivery times are estimates and may vary due to factors including traffic, weather, and order volume. Nightcrawlers and its riders will make reasonable efforts to deliver orders promptly. By providing a delivery address, you confirm that someone is available to receive the order. Failed deliveries due to incorrect addresses or unavailability may result in additional charges.`
        },
        {
            title: '7. Rider Terms',
            content: `Riders on the Platform are independent contractors, not employees of Nightcrawlers. All riders must undergo a verification process before being approved. Riders are responsible for maintaining valid identification, vehicle documentation, and insurance as required by local law. Riders must adhere to all traffic laws and safety regulations during deliveries.`
        },
        {
            title: '8. Cancellation and Refunds',
            content: `Orders may be cancelled within a limited time window after placement. Once a vendor has started preparing an order, cancellation may not be possible and may incur a cancellation fee. Refunds for quality issues or incorrect orders will be reviewed on a case-by-case basis. Approved refunds will be processed within 5–10 business days to the original payment method.`
        },
        {
            title: '9. Prohibited Conduct',
            content: `Users must not: (a) use the Platform for any unlawful purpose; (b) submit false or misleading information; (c) harass, abuse, or threaten other users, vendors, or riders; (d) attempt to circumvent Platform fees; (e) copy, modify, or distribute Platform content without permission; (f) use automated tools to access the Platform; or (g) interfere with the proper functioning of the Platform.`
        },
        {
            title: '10. Limitation of Liability',
            content: `Nightcrawlers is provided "as is" without warranties of any kind. To the maximum extent permitted by law, Nightcrawlers shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform, including but not limited to loss of profits, data, or other intangible losses.`
        },
        {
            title: '11. Intellectual Property',
            content: `All content on the Platform, including logos, text, graphics, and software, is the property of Nightcrawlers Limited or its licensors and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works from any Platform content without express written permission.`
        },
        {
            title: '12. Contact Information',
            content: `For questions about these Terms of Service, please contact us at legal@nightcrawlers.ng or through our Contact page.`
        },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-poppins overflow-x-hidden">
            <Header />

            <main className="flex-grow w-full px-4 sm:px-6 md:px-[40px] pt-[1%] pb-[60px] sm:pb-[80px]">
                <div className="max-w-[900px] mx-auto">

                    {/* Header */}
                    <div className="flex flex-col items-center justify-center gap-[16px] sm:gap-[20px] text-center mb-[40px] sm:mb-[60px]">
                        <div className="inline-flex items-center justify-center gap-[8px] sm:gap-[10px] border border-[#EAECF0] rounded-[50px] bg-[rgba(46,61,134,0.05)] px-[12px] sm:px-[16px] py-[8px] sm:py-[10px]">
                            <p className="leading-[22px] sm:leading-[25px] md:leading-[27px] text-[#363838] text-[14px] sm:text-[16px] md:text-[18px]">Legal</p>
                        </div>
                        <h1 className="leading-[120%] tracking-[-0.02em] text-[#222222] text-[28px] sm:text-[36px] md:text-[48px] font-semibold">
                            Terms of Service
                        </h1>
                        <p className="text-[#667085] text-[14px] sm:text-[15px]">
                            Last updated: {lastUpdated}
                        </p>
                    </div>

                    {/* Intro */}
                    <div className="bg-[rgba(234,236,240,0.42)] rounded-[10px] p-5 sm:p-6 mb-8">
                        <p className="text-[#667085] text-[14px] sm:text-[15px] leading-[24px]">
                            Please read these Terms of Service carefully before using Nightcrawlers. These terms govern your access to and use of the platform, including any content, functionality, and services offered. By using Nightcrawlers, you accept and agree to be bound by these terms.
                        </p>
                    </div>

                    {/* Sections */}
                    <div className="space-y-8 sm:space-y-10">
                        {sections.map((section) => (
                            <div key={section.title}>
                                <h2 className="text-[#222222] text-[18px] sm:text-[20px] font-semibold mb-3 pb-2 border-b border-[#EAECF0]">
                                    {section.title}
                                </h2>
                                <p className="text-[#667085] text-[14px] sm:text-[15px] leading-[24px] sm:leading-[26px]">
                                    {section.content}
                                </p>
                            </div>
                        ))}
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Terms;

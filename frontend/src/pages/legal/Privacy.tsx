import React from 'react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

const Privacy: React.FC = () => {
    const lastUpdated = 'February 25, 2026';

    const sections = [
        {
            title: '1. Information We Collect',
            content: `We collect information you provide directly when creating an account, placing orders, or contacting support. This includes your name, email address, phone number, delivery addresses, and payment information. We also automatically collect device information, IP addresses, browser type, and usage data when you interact with the Platform.`
        },
        {
            title: '2. How We Use Your Information',
            content: `We use your personal information to: (a) process and deliver your orders; (b) communicate with you about your account and orders; (c) provide customer support; (d) personalize your experience and show relevant vendors; (e) improve and maintain the Platform; (f) detect and prevent fraud; (g) comply with legal obligations; and (h) send promotional communications (with your consent).`
        },
        {
            title: '3. Information Sharing',
            content: `We share your information with: (a) vendors, to fulfill your orders (your name and delivery details); (b) riders, to complete deliveries (your name, phone number, and delivery address); (c) payment processors, to handle transactions securely; and (d) service providers who help us operate the Platform. We do not sell your personal information to third parties.`
        },
        {
            title: '4. Data Security',
            content: `We implement industry-standard security measures to protect your personal information, including encryption of data in transit and at rest, secure server infrastructure, and regular security audits. However, no method of electronic storage is 100% secure, and we cannot guarantee absolute security. We encourage you to use strong passwords and keep your credentials confidential.`
        },
        {
            title: '5. Cookies and Tracking',
            content: `We use cookies and similar technologies to enhance your experience, remember your preferences, and analyze Platform usage. Essential cookies are required for the Platform to function. Analytics cookies help us understand how users interact with the Platform. You can manage cookie preferences through your browser settings, but disabling certain cookies may affect Platform functionality.`
        },
        {
            title: '6. Your Rights',
            content: `You have the right to: (a) access the personal data we hold about you; (b) request correction of inaccurate information; (c) request deletion of your account and associated data; (d) withdraw consent for marketing communications at any time; (e) request a copy of your data in a portable format; and (f) lodge a complaint with a relevant data protection authority.`
        },
        {
            title: '7. Data Retention',
            content: `We retain your personal information for as long as your account is active or as needed to provide services. After account deletion, we may retain certain information for up to 12 months for legal compliance, fraud prevention, and dispute resolution purposes. Transaction records may be retained longer as required by applicable financial regulations.`
        },
        {
            title: "8. Children's Privacy",
            content: `Nightcrawlers is not intended for users under the age of 16. We do not knowingly collect personal information from children. If we learn that we have collected information from a child under 16, we will take immediate steps to delete that information. If you believe a child has provided us with personal data, please contact us immediately.`
        },
        {
            title: '9. Third-Party Links',
            content: `The Platform may contain links to third-party websites and services. We are not responsible for the privacy practices or content of these external sites. We encourage you to review the privacy policies of any third-party services before providing them with your personal information.`
        },
        {
            title: '10. Changes to This Policy',
            content: `We may update this Privacy Policy from time to time to reflect changes in our practices or for legal reasons. We will notify you of material changes through the Platform or via email. Your continued use of Nightcrawlers after any changes constitutes acceptance of the updated policy. We encourage you to review this policy periodically.`
        },
        {
            title: '11. Location Data',
            content: `With your permission, we collect location data to show nearby vendors, estimate delivery times, and facilitate rider navigation. You can disable location services through your device settings at any time. However, this may limit certain features such as nearby vendor discovery and real-time delivery tracking.`
        },
        {
            title: '12. Contact Us',
            content: `If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact our Data Protection team at support@nightcrawlers.app, or write to us at Nightcrawlers Limited, Lekki Phase 1 estate, Lekki, Lagos, Nigeria.`
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
                            Privacy Policy
                        </h1>
                        <p className="text-[#667085] text-[14px] sm:text-[15px]">
                            Last updated: {lastUpdated}
                        </p>
                    </div>

                    {/* Intro */}
                    <div className="bg-[rgba(234,236,240,0.42)] rounded-[10px] p-5 sm:p-6 mb-8">
                        <p className="text-[#667085] text-[14px] sm:text-[15px] leading-[24px]">
                            At Nightcrawlers, your privacy is important to us. This Privacy Policy explains how we collect, use, share, and protect your personal information when you use our platform. By using Nightcrawlers, you consent to the practices described in this policy.
                        </p>
                    </div>

                    {/* Key Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                        {[
                            { emoji: '🔒', label: 'End-to-end encryption', desc: 'Your data is secured' },
                            { emoji: '🚫', label: 'No data selling', desc: 'We never sell your info' },
                            { emoji: '✅', label: 'Full transparency', desc: 'You control your data' },
                        ].map((h) => (
                            <div key={h.label} className="flex items-center gap-3 bg-white border border-[#EAECF0] rounded-[10px] p-4">
                                <span className="text-[24px]">{h.emoji}</span>
                                <div>
                                    <p className="text-[#222222] text-[14px] font-semibold">{h.label}</p>
                                    <p className="text-[#667085] text-[12px]">{h.desc}</p>
                                </div>
                            </div>
                        ))}
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

export default Privacy;

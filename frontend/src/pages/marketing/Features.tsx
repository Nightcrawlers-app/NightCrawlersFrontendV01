import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { Truck, Clock, ShieldCheck, MapPin, Smartphone, Star, CreditCard, Users, Store, Headphones } from 'lucide-react';

const Features: React.FC = () => {
    const features = [
        { icon: <Truck size={24} />, title: 'Lightning-Fast Delivery', desc: 'Riders positioned across the city, ready to go.' },
        { icon: <Store size={24} />, title: 'Multi-Vendor Marketplace', desc: 'Restaurants, pharmacies, and more, in one app.' },
        { icon: <MapPin size={24} />, title: 'Real-Time Tracking', desc: 'Watch your rider on a live map, door to door.' },
        { icon: <ShieldCheck size={24} />, title: 'Verified Riders', desc: 'Every rider is checked before their first delivery.', trust: true },
        { icon: <CreditCard size={24} />, title: 'Secure Payments', desc: 'Card, mobile money, or cash — all encrypted.', trust: true },
        { icon: <Clock size={24} />, title: 'Scheduled Orders', desc: 'Plan ahead for the meals that matter.' },
        { icon: <Smartphone size={24} />, title: 'Easy-to-Use Interface', desc: 'Clean and intuitive, on any device.' },
        { icon: <Users size={24} />, title: 'Vendor Dashboard', desc: 'Manage stores, orders, and earnings in one place.' },
        { icon: <Headphones size={24} />, title: '24/7 Support', desc: "Chat, email, or call — we're always on." },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-poppins overflow-x-hidden">
            <Header />

            <main className="flex-grow w-full px-4 sm:px-6 md:px-[40px] pt-[1%] pb-[40px] sm:pb-[56px]">
                <div className="max-w-[1440px] mx-auto">

                    <div className="flex flex-col items-center justify-center gap-[20px] sm:gap-[25px] md:gap-[30px] text-center mb-[36px] sm:mb-[48px]">
                        <div className="inline-flex items-center justify-center gap-[8px] sm:gap-[10px] border border-[#EAECF0] rounded-[50px] bg-[rgba(46,61,134,0.05)] px-[12px] sm:px-[16px] py-[8px] sm:py-[10px]">
                            <p className="leading-[22px] sm:leading-[25px] md:leading-[27px] text-[#363838] text-[14px] sm:text-[16px] md:text-[18px]">Features</p>
                        </div>
                        <h1 className="leading-[120%] tracking-[-0.02em] text-[#222222] text-[28px] sm:text-[36px] md:text-[48px] font-semibold max-w-[800px]">
                            Everything You Need, Built In
                        </h1>
                        <p className="leading-[22px] sm:leading-[26px] text-[#667085] text-[14px] sm:text-[16px] max-w-[520px]">
                            Everything you need to order, deliver, and sell — seamlessly.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-[48px] sm:mb-[64px]">
                        {features.map((feature) => (
                            <div key={feature.title} className="bg-white border border-[#EAECF0] rounded-[12px] p-6 sm:p-8 hover:shadow-md hover:border-[#C62222]/20 transition-all group">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${feature.trust ? 'bg-night-green-50 text-night-green-700' : 'bg-[#FFF0F0] text-[#C62222]'}`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-[#222222] text-[18px] sm:text-[20px] font-semibold mb-2">{feature.title}</h3>
                                <p className="text-[#667085] text-[14px] sm:text-[15px] leading-[22px]">{feature.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gradient-to-br from-[#C62222] to-[#991b1b] rounded-[16px] p-8 sm:p-12 mb-[48px] sm:mb-[64px] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-10 rounded-full -ml-12 -mb-12 blur-3xl"></div>
                        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                            <div className="text-center lg:text-left">
                                <h2 className="text-white text-[24px] sm:text-[32px] font-bold mb-3">Want to become a vendor?</h2>
                                <p className="text-red-100 text-[14px] sm:text-[16px] max-w-[500px]">Reach thousands of new customers in your area.</p>
                            </div>
                            <Link to="/vendor-signup" className="inline-flex items-center justify-center gap-2 bg-white text-[#C62222] text-[15px] font-bold rounded-[8px] px-8 py-3.5 hover:bg-gray-50 transition-colors shadow-lg flex-shrink-0">
                                Sign Up as Partner
                            </Link>
                        </div>
                    </div>

                    <div className="mb-[60px]">
                        <div className="text-center mb-[40px]">
                            <p className="text-[#C62222] text-[14px] sm:text-[16px] font-semibold mb-2">Built for Everyone</p>
                            <h2 className="text-[#222222] text-[24px] sm:text-[32px] font-semibold leading-tight tracking-[-0.02em]">Three Platforms, One Ecosystem</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                            {[
                                { title: 'For Customers', items: ['Browse & order from any vendor', 'Real-time order tracking', 'Saved addresses & favorites', 'Order history & reorder'], accent: '#C62222' },
                                { title: 'For Vendors', items: ['Full store management', 'Menu & item control', 'Order notifications', 'Earnings analytics'], accent: '#222222' },
                                { title: 'For Riders', items: ['Accept orders nearby', 'Turn-by-turn navigation', 'Earnings tracking', 'Flexible schedule'], accent: '#008751' },
                            ].map((role) => (
                                <div key={role.title} className="border border-[#EAECF0] rounded-[12px] p-6 sm:p-8 hover:shadow-md transition-shadow">
                                    <h3 className="text-[18px] sm:text-[20px] font-bold mb-4" style={{ color: role.accent }}>{role.title}</h3>
                                    <ul className="space-y-3">
                                        {role.items.map((item) => (
                                            <li key={item} className="flex items-start gap-3 text-[#667085] text-[14px] sm:text-[15px]">
                                                <Star size={14} style={{ color: role.accent }} className="mt-1 flex-shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Features;
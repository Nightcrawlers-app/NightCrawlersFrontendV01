import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { Package, Truck, Store, ShoppingBag, Shield, Zap } from 'lucide-react';

const Overview: React.FC = () => {
    return (
        <div className="min-h-screen bg-white flex flex-col font-poppins overflow-x-hidden">
            <Header />

            <main className="flex-grow w-full px-4 sm:px-6 md:px-[40px] pt-[1%] pb-[60px] sm:pb-[80px]">
                <div className="max-w-[1440px] mx-auto">

                    {/* Hero Section */}
                    <div className="flex flex-col items-center justify-center gap-[20px] sm:gap-[25px] md:gap-[30px] text-center mb-[60px] sm:mb-[80px]">
                        <div className="inline-flex items-center justify-center gap-[8px] sm:gap-[10px] border border-[#EAECF0] rounded-[50px] bg-[rgba(46,61,134,0.05)] px-[12px] sm:px-[16px] py-[8px] sm:py-[10px]">
                            <p className="leading-[22px] sm:leading-[25px] md:leading-[27px] text-[#363838] text-[14px] sm:text-[16px] md:text-[18px]">Overview</p>
                        </div>
                        <h1 className="leading-[120%] tracking-[-0.02em] text-[#222222] text-[28px] sm:text-[36px] md:text-[48px] font-semibold max-w-[800px]">
                            Your City, Delivered to Your Door
                        </h1>
                        <p className="leading-[22px] sm:leading-[26px] md:leading-[30px] text-[#667085] text-[14px] sm:text-[17px] md:text-[20px] max-w-[650px]">
                            Night Crawlers is a fast, reliable delivery platform connecting you with restaurants, grocery stores, pharmacies, and beauty shops — all in one place.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 mt-2">
                            <Link to="/explore" className="inline-flex items-center justify-center gap-2 bg-[#C62222] text-white text-[15px] font-semibold rounded-[6px] px-6 py-3 hover:bg-[#A01B1B] transition-colors shadow-sm">
                                Start Ordering
                            </Link>
                            <Link to="/vendors" className="inline-flex items-center justify-center gap-2 border border-[#EAECF0] text-[#222222] text-[15px] font-semibold rounded-[6px] px-6 py-3 hover:bg-gray-50 transition-colors">
                                Become a Partner
                            </Link>
                        </div>
                    </div>

                    {/* How It Works */}
                    <div className="mb-[80px] sm:mb-[100px]">
                        <div className="text-center mb-[40px] sm:mb-[50px]">
                            <p className="text-[#C62222] text-[14px] sm:text-[16px] font-semibold mb-2">How It Works</p>
                            <h2 className="text-[#222222] text-[24px] sm:text-[32px] md:text-[36px] font-semibold leading-tight tracking-[-0.02em]">Simple. Fast. Reliable.</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                            {[
                                { step: '01', icon: <ShoppingBag size={28} />, title: 'Browse & Order', desc: 'Explore hundreds of vendors near you. Add items to your cart and checkout in seconds.' },
                                { step: '02', icon: <Store size={28} />, title: 'Vendor Prepares', desc: 'Your order is sent directly to the vendor who starts preparing it right away.' },
                                { step: '03', icon: <Truck size={28} />, title: 'Fast Delivery', desc: 'A verified rider picks up your order and delivers it to your doorstep — fresh and fast.' },
                            ].map((item) => (
                                <div key={item.step} className="relative bg-white border border-[#EAECF0] rounded-[12px] p-6 sm:p-8 hover:shadow-md hover:border-[#C62222]/20 transition-all group">
                                    <span className="absolute top-4 right-4 text-[48px] font-bold text-gray-100 group-hover:text-[#C62222]/10 transition-colors leading-none">{item.step}</span>
                                    <div className="w-12 h-12 rounded-xl bg-[#FFF0F0] text-[#C62222] flex items-center justify-center mb-5">
                                        {item.icon}
                                    </div>
                                    <h3 className="text-[#222222] text-[18px] sm:text-[20px] font-semibold mb-2">{item.title}</h3>
                                    <p className="text-[#667085] text-[14px] sm:text-[15px] leading-[22px]">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* What We Deliver */}
                    <div className="mb-[80px] sm:mb-[100px]">
                        <div className="text-center mb-[40px] sm:mb-[50px]">
                            <p className="text-[#C62222] text-[14px] sm:text-[16px] font-semibold mb-2">Categories</p>
                            <h2 className="text-[#222222] text-[24px] sm:text-[32px] md:text-[36px] font-semibold leading-tight tracking-[-0.02em]">More Than Just Food</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            {[
                                { icon: <Package size={24} />, label: 'Restaurants', desc: 'Local favorites & chains' },
                                { icon: <ShoppingBag size={24} />, label: 'Groceries', desc: 'Fresh produce & staples' },
                                { icon: <Shield size={24} />, label: 'Pharmacies', desc: 'Medications & wellness' },
                                { icon: <Zap size={24} />, label: 'Beauty & More', desc: 'Cosmetics & self-care' },
                            ].map((cat) => (
                                <div key={cat.label} className="flex flex-col items-center text-center bg-white border border-[#EAECF0] rounded-[12px] p-5 sm:p-6 hover:shadow-md hover:border-[#C62222]/20 transition-all">
                                    <div className="w-12 h-12 rounded-full bg-[#FFF0F0] text-[#C62222] flex items-center justify-center mb-4">
                                        {cat.icon}
                                    </div>
                                    <h3 className="text-[#222222] text-[16px] sm:text-[18px] font-semibold mb-1">{cat.label}</h3>
                                    <p className="text-[#667085] text-[13px] sm:text-[14px]">{cat.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-[#222222] rounded-[16px] p-8 sm:p-12 mb-[80px] sm:mb-[100px]">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
                            {[
                                { value: '500+', label: 'Vendor Partners' },
                                { value: '10K+', label: 'Happy Customers' },
                                { value: '50K+', label: 'Orders Delivered' },
                                { value: '15min', label: 'Avg Delivery Time' },
                            ].map((stat) => (
                                <div key={stat.label}>
                                    <p className="text-white text-[28px] sm:text-[36px] font-bold mb-1">{stat.value}</p>
                                    <p className="text-gray-400 text-[13px] sm:text-[14px] font-medium">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="flex flex-col items-center text-center gap-5">
                        <h2 className="text-[#222222] text-[24px] sm:text-[32px] font-semibold leading-tight">Ready to get started?</h2>
                        <p className="text-[#667085] text-[15px] sm:text-[17px] max-w-[500px]">Join thousands of customers enjoying fast, fresh deliveries every day.</p>
                        <Link to="/signup" className="inline-flex items-center justify-center gap-2 bg-[#C62222] text-white text-[15px] font-semibold rounded-[6px] px-8 py-3 hover:bg-[#A01B1B] transition-colors shadow-sm">
                            Create an Account
                        </Link>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Overview;

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, ChevronLeft } from 'lucide-react';
import logo from '../assets/logo.png';

/**
 * Catch-all for URLs that match no route.
 *
 * Without this, React Router renders nothing at all for an unknown path, which
 * shows up as a blank white page with no error anywhere — impossible to
 * diagnose from the browser.
 */
const NotFound: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center font-poppins px-6 py-12">
            <Link to="/" className="mb-6">
                <img src={logo} alt="Night Crawlers" className="h-28 w-auto object-contain" />
            </Link>

            <div className="w-full max-w-md text-center">
                <div className="w-16 h-16 bg-[#FEECEC] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Compass className="w-8 h-8 text-[#C62222]" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
                <p className="text-sm text-gray-500 mb-1">
                    Nothing lives at this address.
                </p>
                <p className="text-xs text-gray-400 font-mono break-all mb-8">
                    {location.pathname}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <ChevronLeft size={16} />
                        Go back
                    </button>
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center px-5 py-2.5 bg-[#C62222] text-white text-sm font-semibold rounded-lg hover:bg-[#A01B1B] transition-colors"
                    >
                        Back to home
                    </Link>
                    <Link
                        to="/explore"
                        className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Explore stores
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;

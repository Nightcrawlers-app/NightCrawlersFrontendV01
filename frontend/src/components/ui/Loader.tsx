import React from 'react';

interface LoaderProps {
    fullScreen?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ fullScreen = false }) => {
    const containerClasses = fullScreen
        ? "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500"
        : "flex flex-col items-center justify-center py-20";

    return (
        <div className={containerClasses}>
            <div className="relative flex items-center justify-center mb-4">
                {/* Outer Ring */}
                <div className="w-12 h-12 border-4 border-gray-100 border-t-[#E00B0B] rounded-full animate-spin"></div>
            </div>

            {/* Text Branding - Clean */}
            <div className="flex flex-col items-center">
                <span className="text-gray-400 font-medium text-xs tracking-widest uppercase">
                    Loading...
                </span>
            </div>
        </div>
    );
};

export default Loader;

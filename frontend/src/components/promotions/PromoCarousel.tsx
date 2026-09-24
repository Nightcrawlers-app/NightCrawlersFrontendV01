import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { getLivePromotions, describeDiscount } from '../../services/api';
import type { Promotion } from '../../types/models';

interface PromoCarouselProps {
    onSelect: (promo: Promotion) => void;
    /** Highlights the promo currently being browsed. */
    activeId?: string | null;
}

const AUTOPLAY_MS = 4500;

/**
 * Live promos from the backend (managed in the admin dashboard). Each slide is
 * a real button: tapping it applies the promo and shows where it can be used.
 * Renders nothing when there are no live promos.
 */
const PromoCarousel: React.FC<PromoCarouselProps> = ({ onSelect, activeId }) => {
    const [promos, setPromos] = useState<Promotion[]>([]);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const trackRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let cancelled = false;
        getLivePromotions()
            .then((list) => !cancelled && setPromos(list))
            .catch(() => !cancelled && setPromos([]));
        return () => {
            cancelled = true;
        };
    }, []);

    const goTo = useCallback((i: number) => {
        const track = trackRef.current;
        if (!track || !track.children.length) return;
        const count = track.children.length;
        const next = (i + count) % count;
        const slide = track.children[next] as HTMLElement;
        track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
        setIndex(next);
    }, []);

    // Autoplay, paused while hovered/touched and when there's only one slide.
    useEffect(() => {
        if (paused || promos.length < 2) return;
        const id = window.setInterval(() => goTo(index + 1), AUTOPLAY_MS);
        return () => window.clearInterval(id);
    }, [paused, promos.length, index, goTo]);

    // Keep the dots in sync when the user swipes.
    const onScroll = () => {
        const track = trackRef.current;
        if (!track) return;
        const slides = Array.from(track.children) as HTMLElement[];
        const left = track.scrollLeft;
        let best = 0;
        slides.forEach((s, i) => {
            if (Math.abs(s.offsetLeft - track.offsetLeft - left) < Math.abs(slides[best].offsetLeft - track.offsetLeft - left)) best = i;
        });
        if (best !== index) setIndex(best);
    };

    if (!promos.length) return null;

    return (
        <div className="mb-[40px]">
            <h2 className="text-[18px] md:text-[20px] font-medium text-[#222222] mb-[16px] md:mb-[24px]">Promos</h2>
            <div
                className="relative"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onTouchStart={() => setPaused(true)}
            >
                <div
                    ref={trackRef}
                    onScroll={onScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 pb-2"
                >
                    {promos.map((promo) => (
                        <button
                            key={promo.id}
                            type="button"
                            onClick={() => onSelect(promo)}
                            aria-label={`${promo.title}. ${describeDiscount(promo)}`}
                            className={`group snap-center shrink-0 w-full md:w-[80%] lg:w-[60%] h-[180px] sm:h-[200px] md:h-[240px] rounded-[12px] md:rounded-[16px] overflow-hidden relative text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C62222]/40 ${activeId === promo.id ? 'ring-4 ring-[#C62222]' : ''}`}
                        >
                            {promo.imageUrl ? (
                                <img
                                    src={promo.imageUrl}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-[#C62222] via-[#A01B1B] to-[#3B0A0A]" />
                            )}
                            {/* Legibility scrim */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />

                            <div className="relative h-full flex flex-col justify-between p-5 md:p-7 max-w-[80%]">
                                {promo.badge && (
                                    <span className="self-start inline-flex items-center gap-1.5 bg-white text-[#C62222] text-[12px] md:text-[13px] font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow">
                                        <Tag size={13} /> {promo.badge}
                                    </span>
                                )}
                                <div>
                                    <h3 className="text-white text-[22px] sm:text-[26px] md:text-[34px] font-bold leading-tight drop-shadow">
                                        {promo.title}
                                    </h3>
                                    <p className="text-white/85 text-[12px] sm:text-[14px] mt-1">
                                        {promo.subtitle || describeDiscount(promo)}
                                    </p>
                                    <span className="inline-flex items-center gap-1 mt-3 bg-[#C62222] group-hover:bg-white group-hover:text-[#C62222] text-white text-[13px] font-semibold px-4 py-2 rounded-[8px] transition-colors">
                                        {activeId === promo.id ? 'Applied — showing stores' : 'Order now'}
                                        <ChevronRight size={15} />
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {promos.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={() => goTo(index - 1)}
                            aria-label="Previous promo"
                            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow items-center justify-center hover:bg-white"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => goTo(index + 1)}
                            aria-label="Next promo"
                            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow items-center justify-center hover:bg-white"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <div className="flex justify-center gap-1.5 mt-3">
                            {promos.map((p, i) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => goTo(i)}
                                    aria-label={`Show promo ${i + 1}`}
                                    className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-[#C62222]' : 'w-1.5 bg-gray-300'}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PromoCarousel;

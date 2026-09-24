import React from 'react';
import { Vendor, Feature } from '../types';
import { Phone, Clock, Award } from 'lucide-react';
import kfcLogo from '../assets/vendors/kfc-logo.svg';
import chickenRepublicLogo from '../assets/vendors/chicken-republic-logo.svg';
import dominosLogo from '../assets/vendors/dominos-logo.svg';
import kilimanjaroLogo from '../assets/vendors/kilimanjaro-logo.svg';
import haansaLogo from '../assets/vendors/haansa-logo.svg';

export const VENDORS: Vendor[] = [
  {
    id: '1',
    name: 'KFC',
    logo: kfcLogo,
    altText: 'KFC restaurant logo'
  },
  {
    id: '2',
    name: 'Chicken Republic',
    logo: chickenRepublicLogo,
    altText: 'Chicken Republic restaurant logo'
  },
  {
    id: '3',
    name: 'Dominos Pizza',
    logo: dominosLogo,
    altText: 'Dominos Pizza restaurant logo'
  },
  {
    id: '4',
    name: 'Kilimanjaro',
    logo: kilimanjaroLogo,
    altText: 'Kilimanjaro restaurant logo'
  },
  {
    id: '5',
    name: 'Haansa',
    logo: haansaLogo,
    altText: 'Haansa restaurant logo'
  }
];

export const FEATURES: Feature[] = [
  {
    id: '1',
    title: 'Easy to Order',
    description: 'From anywhere, whenever. Choose your meal and place your order—simple and convenient.',
    icon: <Phone className="w-12 h-12 text-night-red-500" />
  },
  {
    id: '2',
    title: 'Fast Delivery',
    description: 'From pickup to your doorstep, we deliver quickly so you enjoy your meal on time.',
    icon: <Clock className="w-12 h-12 text-night-red-500" />
  },
  {
    id: '3',
    title: 'Best Quality',
    description: 'Partnered with top vendors to ensure quality, consistency, and satisfaction.',
    icon: <Award className="w-12 h-12 text-night-red-500" />
  }
];

export const NAVIGATION_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'Contact Us', href: '/contact' },
  { name: 'Partners', href: '/vendors' },
  { name: 'FAQs', href: '/faq' }
];

export const FOOTER_LINKS = {
  product: [
    { name: 'Overview', href: '/overview' },
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Promotions', href: '/promotions' }
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Careers', href: '/careers' },
    { name: 'Contact', href: '/contact' },
    { name: 'Press', href: '/press' }
  ],
  support: [
    { name: 'Help Center', href: '/help' },
    { name: 'Terms', href: '/terms' },
    { name: 'Privacy', href: '/privacy' },
    { name: 'Security', href: '/security' }
  ]
};

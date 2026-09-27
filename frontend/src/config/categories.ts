/**
 * How each business type is shown to customers on the home page.
 * Change the tagline or icon here and it updates everywhere it's used.
 */
import type { BusinessType } from '../types/models';

import foodIcon from '../assets/category-food.png';
import groceriesIcon from '../assets/category-groceries.png';
import pharmacyIcon from '../assets/category-pharmacy.png';
import drinksIcon from '../assets/category-drinks.png';
import clubsIcon from '../assets/category-clubs.png';

export type CategoryDisplay = {
    type: BusinessType;
    /** Short customer-facing name */
    label: string;
    /** One line under the name */
    tagline: string;
    icon: string;
};

export const CATEGORY_DISPLAY: CategoryDisplay[] = [
    { type: 'Food', label: 'Food', tagline: 'Restaurants & late-night bites', icon: foodIcon },
    { type: 'Groceries', label: 'Groceries', tagline: 'Essentials & household items', icon: groceriesIcon },
    { type: 'Pharmacy', label: 'Pharmacy', tagline: 'Medicine & personal care', icon: pharmacyIcon },
    { type: 'Drinks', label: 'Drinks', tagline: 'Soft drinks, wine & spirits', icon: drinksIcon },
    { type: 'Clubs/Lounges', label: 'Lounges', tagline: 'Bottle service & lounge orders', icon: clubsIcon },
];

/**
 * Hand-picked brand tiles for the home page's "Popular on Nightcrawlers"
 * section — one list, split into tabs by `category`. This is also the ad slot:
 * to promote a paying store, add or reorder entries here.
 *
 *   category — which tab it appears under (Food, Groceries, Pharmacy, Drinks, Clubs/Lounges)
 *   storeId  — open exactly this store (use this for paid placements)
 *   search   — otherwise, open the first store whose name matches this text
 *   image    — logo or photo; put the file in src/assets/brands/ and import it below
 *
 * Tabs with fewer than 6 hand-picked entries are topped up automatically with
 * real stores from that category (nearest first), so a tab is never empty
 * once you have stores in it. If nothing matches, a tile opens Explore
 * filtered to that name, so it never leads nowhere.
 *
 * EXAMPLE — adding a pharmacy (after saving its logo as src/assets/brands/medplus.webp):
 *   import medplusImg from '../assets/brands/medplus.webp';
 *   { name: 'MedPlus', image: medplusImg, search: 'MedPlus', category: 'Pharmacy' },
 */
import type { BusinessType } from '../types/models';

import kfcImg from '../../../.figma/image/mje79tfs-ebqiolr.png';
import chickenRepublicImg from '../../../.figma/image/mje79tft-mnpk82m.png';
import dominosImg from '../../../.figma/image/mje79tfy-zdt3g00.png';
import kilimanjaroImg from '../../../.figma/image/mje79tfy-vnfduy8.png';
import pizzaHutImg from '../../../.figma/image/mje79tfy-l6ekoeg.png';

export type FeaturedVendor = {
    name: string;
    image: string;
    storeId?: string;
    search: string;
    category: BusinessType;
};

export const FEATURED_VENDORS: FeaturedVendor[] = [
    { name: 'KFC', image: kfcImg, search: 'KFC', category: 'Food' },
    { name: 'Chicken Republic', image: chickenRepublicImg, search: 'Chicken Republic', category: 'Food' },
    { name: 'Dominos Pizza', image: dominosImg, search: 'Domino', category: 'Food' },
    { name: 'Kilimanjaro', image: kilimanjaroImg, search: 'Kilimanjaro', category: 'Food' },
    { name: 'Pizza Hut', image: pizzaHutImg, search: 'Pizza Hut', category: 'Food' },
];

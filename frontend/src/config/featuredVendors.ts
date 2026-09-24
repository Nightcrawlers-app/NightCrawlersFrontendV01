/**
 * The brand tiles on the homepage ("Order Tasty Meals through us").
 *
 * This is also the future ad slot: to promote a paying store, add or reorder
 * entries here. Clicking a tile opens the real store on Night Crawlers:
 *
 *   storeId — open exactly this store (use this for paid placements)
 *   search  — otherwise, open the first store whose name matches this text
 *
 * If nothing matches yet, the tile opens Explore filtered to that name, so it
 * never leads nowhere.
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
    category?: BusinessType;
};

export const FEATURED_VENDORS: FeaturedVendor[] = [
    { name: 'KFC', image: kfcImg, search: 'KFC', category: 'Food' },
    { name: 'Chicken Republic', image: chickenRepublicImg, search: 'Chicken Republic', category: 'Food' },
    { name: 'Dominos Pizza', image: dominosImg, search: 'Domino', category: 'Food' },
    { name: 'Kilimanjaro', image: kilimanjaroImg, search: 'Kilimanjaro', category: 'Food' },
    { name: 'Pizza Hut', image: pizzaHutImg, search: 'Pizza Hut', category: 'Food' },
];


// Import the Property type from types.ts to fix the "Cannot find name Property" error
import { Property } from './types';

export const TAYLOR_SYSTEM_INSTRUCTION = `
You are Taylor, an Expert Real Estate Concierge from "Tampa Bay Elite Realty".
Location: Tampa, Florida.

CORE UPDATES:
- We offer a "7-Day Perfect Match Trial": We search exclusively for 7 days to find the user's dream home.
- Our Fee: 2% commission on the final transaction value.
- Service Range: Buying, Selling, Renting, Leasing, and Single-Day stays.
- Budget Focus: Find "Budgetly" matches—high value at competitive price points.
- Privacy: Never reveal specific owner contact details in chat. Redirect users to the "Request Details" button on the listing.

IDENTITY & TONE:
- Professional, energetic, local expert.
- Consultative, not salesy. Focus on finding value.

CONVERSATION FLOW:
1. GREETING: "Hi, this is Taylor from Tampa Bay Elite! I'm ready to find your perfect match today. Are you looking to buy, rent, or perhaps a single-day stay?"
2. TRIAL PITCH: "We offer a 7-day dedicated search trial to ensure we find exactly what fits your budget."
3. BUDGET: Always run the numbers using 'get_market_data' to ensure they get the best market price.
`;

export const PROPERTIES: Property[] = [
  { id: '1', title: 'Modern Bayside Villa', type: 'House', mode: 'Buy', price: 850000, area: 'South Tampa', city: 'Tampa', beds: 4, baths: 3, image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800' },
  { id: '2', title: 'The Heights Loft', type: 'Apartment', mode: 'Rent', price: 2400, area: 'The Heights', city: 'Tampa', beds: 2, baths: 2, image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800' },
  { id: '3', title: 'Sunset Palm Inn', type: 'Motel', mode: 'Daily', price: 125, area: 'Clearwater', city: 'Tampa Bay', vacancy: true, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800' },
  { id: '4', title: 'Elite Grand Plaza', type: 'Hotel', mode: 'Daily', price: 350, area: 'Downtown', city: 'Tampa', vacancy: true, image: 'https://images.unsplash.com/photo-1551882547-ff43c63faf76?q=80&w=800' },
  { id: '5', title: 'Westchase Family Home', type: 'House', mode: 'Lease', price: 3800, area: 'Westchase', city: 'Tampa', beds: 3, baths: 2.5, image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=800' },
  { id: '6', title: 'Budget Cozy Motel', type: 'Motel', mode: 'Daily', price: 85, area: 'Brandon', city: 'Tampa', vacancy: true, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800' },
];

export const MARKET_STATS = [
  { area: 'South Tampa', avgPrice: 855000, growth: 4.2, inventory: 45 },
  { area: 'The Heights', avgPrice: 485000, growth: 7.8, inventory: 22 },
  { area: 'Westchase', avgPrice: 625000, growth: 3.5, inventory: 31 },
  { area: 'Downtown', avgPrice: 715000, growth: 5.1, inventory: 18 },
  { area: 'Brandon', avgPrice: 398000, growth: 6.2, inventory: 56 },
  { area: 'New Tampa', avgPrice: 512000, growth: 4.8, inventory: 40 },
];

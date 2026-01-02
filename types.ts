
export interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface MarketStat {
  area: string;
  avgPrice: number;
  growth: number;
  inventory: number;
}

export type PropertyType = 'House' | 'Motel' | 'Hotel' | 'Apartment';
export type ListingMode = 'Buy' | 'Rent' | 'Lease' | 'Daily';

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  mode: ListingMode;
  price: number;
  area: string;
  city: string;
  beds?: number;
  baths?: number;
  vacancy?: boolean;
  image: string;
}

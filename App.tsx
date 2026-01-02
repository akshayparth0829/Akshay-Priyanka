
import React, { useState, useMemo } from 'react';
import TaylorChatbot from './components/TaylorChatbot';
import MarketDashboard from './components/MarketDashboard';
import { Property, ListingMode, PropertyType } from './types';
import { PROPERTIES, MARKET_STATS } from './constants';

const App: React.FC = () => {
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<ListingMode | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<PropertyType | 'All'>('All');
  const [priceSort, setPriceSort] = useState<'asc' | 'desc'>('asc');

  const filteredProperties = useMemo(() => {
    return PROPERTIES.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                            p.area.toLowerCase().includes(search.toLowerCase());
      const matchesMode = modeFilter === 'All' || p.mode === modeFilter;
      const matchesType = typeFilter === 'All' || p.type === typeFilter;
      return matchesSearch && matchesMode && matchesType;
    }).sort((a, b) => priceSort === 'asc' ? a.price - b.price : b.price - a.price);
  }, [search, modeFilter, typeFilter, priceSort]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-['Inter']">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg">
              <i className="fas fa-building-circle-check text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter">Tampa Bay <span className="text-blue-600">Elite</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Premium Realty & Concierge</p>
            </div>
          </div>
          <div className="hidden md:flex space-x-8 text-[11px] font-black uppercase tracking-widest text-slate-500">
            <a href="#" className="hover:text-blue-600 transition-colors">Buy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Rent</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Vacancies</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Sell</a>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-400">Commission Rate</p>
              <p className="text-sm font-black text-blue-600">Flat 2%</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-slate-900 py-16 px-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Find Your Perfect Match <br/><span className="text-blue-400 italic">In 7 Days or Less.</span></h2>
          <p className="text-slate-400 mb-10 text-lg font-medium">Expert curated properties with transparent flat 2% commission fees.</p>
          
          <div className="bg-white rounded-3xl p-2 shadow-2xl flex flex-col md:flex-row gap-2 max-w-3xl mx-auto">
            <div className="flex-1 flex items-center px-6">
              <i className="fas fa-search text-slate-300 mr-3"></i>
              <input 
                type="text" 
                placeholder="Search neighborhood or property name..." 
                className="w-full py-4 text-slate-800 font-bold focus:outline-none placeholder:text-slate-300"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-px h-10 bg-slate-100 hidden md:block self-center"></div>
            <button className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-500 transition-all">
              Find Match
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
        {/* Left Sidebar: Filters & Market */}
        <aside className="w-full lg:w-80 space-y-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6">Property Filters</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Listing Type</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-100"
                  onChange={(e) => setModeFilter(e.target.value as any)}
                >
                  <option value="All">All Modes</option>
                  <option value="Buy">Buy</option>
                  <option value="Rent">Rent</option>
                  <option value="Lease">Lease</option>
                  <option value="Daily">Single Day</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {['All', 'House', 'Motel', 'Hotel', 'Apartment'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setTypeFilter(cat as any)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                        typeFilter === cat ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Price Sort</label>
                <div className="flex bg-slate-50 rounded-xl p-1">
                  <button 
                    onClick={() => setPriceSort('asc')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${priceSort === 'asc' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                  >Low to High</button>
                  <button 
                    onClick={() => setPriceSort('desc')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${priceSort === 'desc' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                  >High to Low</button>
                </div>
              </div>
            </div>
          </div>
          <MarketDashboard stats={MARKET_STATS} />
        </aside>

        {/* Right Content: Property Grid */}
        <section className="flex-1 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Available Inventory</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filteredProperties.length} Matches Found</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProperties.map(property => (
              <div key={property.id} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                <div className="relative h-56 overflow-hidden">
                  <img src={property.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={property.title} />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-blue-600">
                    {property.mode}
                  </div>
                  {property.vacancy && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase animate-pulse">
                      Live Vacancy
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">{property.title}</h3>
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    <i className="fas fa-location-dot mr-1"></i> {property.area}, {property.city}
                  </p>
                  <div className="flex items-center space-x-4 mb-6 text-slate-500">
                    {property.beds && (
                      <span className="text-[10px] font-bold"><i className="fas fa-bed mr-1.5"></i>{property.beds} Beds</span>
                    )}
                    {property.baths && (
                      <span className="text-[10px] font-bold"><i className="fas fa-bath mr-1.5"></i>{property.baths} Baths</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <p className="text-xl font-black text-slate-900">
                      <span className="text-slate-300 text-sm font-bold mr-1">$</span>
                      {property.mode === 'Rent' || property.mode === 'Daily' ? `${property.price}/mo` : property.price.toLocaleString()}
                    </p>
                    <button className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProperties.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-6 text-3xl">
                <i className="fas fa-house-circle-xmark"></i>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">No matching properties found</h3>
              <p className="text-slate-400 text-sm">Try adjusting your filters or ask Taylor for help.</p>
            </div>
          )}
        </section>
      </main>

      {/* Floating Chatbot */}
      <TaylorChatbot />
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12 px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
             <h4 className="text-sm font-black text-slate-900 mb-1 tracking-tight">Tampa Bay Elite Realty Group</h4>
             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Licensed Market Analysts & Professional Concierges</p>
          </div>
          <div className="flex space-x-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <a href="#" className="hover:text-blue-600">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600">Service Terms</a>
            <a href="#" className="hover:text-blue-600">Commission Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

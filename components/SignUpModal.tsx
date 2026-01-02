
import React, { useState } from 'react';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SignUpModal: React.FC<SignUpModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    setIsSubmitted(true);
    setTimeout(() => {
      onClose();
      setIsSubmitted(false);
      setFormData({ name: '', email: '' });
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-10">
          {!isSubmitted ? (
            <>
              <div className="flex items-center justify-between mb-8">
                <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm">
                  <i className="fas fa-user-plus"></i>
                </div>
                <button 
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <i className="fas fa-times text-lg"></i>
                </button>
              </div>

              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2">
                Join the Elite Circle
              </h2>
              <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                Unlock daily market reports and personalized insights from Taylor.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">
                    Full Name
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">
                    Email ID
                  </label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 flex items-center justify-center"
                >
                  Confirm Registration <i className="fas fa-arrow-right ml-2 text-[10px]"></i>
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-10 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner">
                <i className="fas fa-check"></i>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Welcome Aboard!</h2>
              <p className="text-slate-500 text-sm font-medium px-4">
                We've added you to the list. Taylor will send your first market analysis report within minutes.
              </p>
            </div>
          )}
        </div>
        
        <div className="bg-slate-50 px-10 py-5 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
            Secured by Tampa Bay Elite Realty
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpModal;

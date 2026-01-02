
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, GenerateContentResponse, Chat } from '@google/genai';
import { TAYLOR_SYSTEM_INSTRUCTION, MARKET_STATS } from '../constants';
import { Message, ConnectionStatus } from '../types';

const getMarketDataTool: FunctionDeclaration = {
  name: 'get_market_data',
  parameters: {
    type: Type.OBJECT,
    description: 'Get real-time market data for a neighborhood in Tampa.',
    properties: {
      neighborhood: { type: Type.STRING, description: 'Neighborhood name' },
    },
    required: ['neighborhood'],
  },
};

const TaylorChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'register' | 'select' | 'chat' | 'voice'>('register');
  const [user, setUser] = useState({ name: '', email: '' });
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTaylorTyping, setIsTaylorTyping] = useState(false);
  const [isTaylorSpeaking, setIsTaylorSpeaking] = useState(false);
  const [input, setInput] = useState('');
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const chatSessionRef = useRef<Chat | null>(null);
  const audioContextsRef = useRef<{ input: AudioContext | null; output: AudioContext | null }>({ input: null, output: null });
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTaylorTyping, isOpen]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.name && user.email) setStep('select');
  };

  const initializeChat = () => {
    if (!process.env.API_KEY) return;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chatSessionRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: TAYLOR_SYSTEM_INSTRUCTION,
      },
    });
    setStep('chat');
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTaylorTyping) return;

    const userMessage: Message = {
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTaylorTyping(true);

    try {
      if (!chatSessionRef.current) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatSessionRef.current = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: { systemInstruction: TAYLOR_SYSTEM_INSTRUCTION },
        });
      }

      const response: GenerateContentResponse = await chatSessionRef.current.sendMessage({
        message: userMessage.text
      });

      const botMessage: Message = {
        role: 'assistant',
        text: response.text || "I'm sorry, I couldn't process that. Could you try again?",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "I'm having a bit of trouble connecting to my database.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTaylorTyping(false);
    }
  };

  const startVoiceMode = async () => {
    if (!process.env.API_KEY) return;
    setStep('voice');
    setStatus(ConnectionStatus.CONNECTING);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      if (!audioContextsRef.current.input) {
        audioContextsRef.current.input = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }
      if (!audioContextsRef.current.output) {
        audioContextsRef.current.output = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      await audioContextsRef.current.input.resume();
      await audioContextsRef.current.output.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [getMarketDataTool] }],
          systemInstruction: TAYLOR_SYSTEM_INSTRUCTION,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
        callbacks: {
          onopen: () => {
            setStatus(ConnectionStatus.CONNECTED);
            const source = audioContextsRef.current.input!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextsRef.current.input!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              let binary = '';
              const bytes = new Uint8Array(int16.buffer);
              for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' } 
              }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextsRef.current.input!.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                const nh = (fc.args as any).neighborhood;
                const data = MARKET_STATS.find(s => s.area.toLowerCase().includes(nh?.toLowerCase() || ''));
                sessionPromise.then(s => s.sendToolResponse({ 
                  functionResponses: { id: fc.id, name: fc.name, response: data || { error: 'Not found' } } 
                }));
              }
            }
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setIsTaylorSpeaking(true);
              const ctx = audioContextsRef.current.output!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const binaryString = atob(audioData);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
              const dataInt16 = new Int16Array(bytes.buffer);
              const frameCount = dataInt16.length;
              const buf = ctx.createBuffer(1, frameCount, 24000);
              const channelData = buf.getChannelData(0);
              for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i] / 32768.0;
              const src = ctx.createBufferSource();
              src.buffer = buf;
              src.connect(ctx.destination);
              src.onended = () => { 
                sourcesRef.current.delete(src); 
                if (sourcesRef.current.size === 0) setIsTaylorSpeaking(false); 
              };
              src.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buf.duration;
              sourcesRef.current.add(src);
            }
          },
          onclose: () => setStatus(ConnectionStatus.DISCONNECTED),
          onerror: () => setStatus(ConnectionStatus.ERROR),
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { setStatus(ConnectionStatus.ERROR); }
  };

  const confirmClose = () => {
    if (sessionRef.current) sessionRef.current.close();
    chatSessionRef.current = null;
    setMessages([]);
    setStep('register');
    setIsOpen(false);
    setShowConfirmClose(false);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      {isOpen ? (
        <div className="w-[calc(100vw-2rem)] sm:w-[320px] md:w-[360px] h-[calc(100dvh-5rem)] sm:h-[500px] md:h-[550px] bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300 relative">
          
          {/* Compact Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between z-10">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=100" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/20 object-cover" alt="Taylor" />
                <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:w-2.5 bg-green-500 rounded-full border border-slate-900"></span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black leading-tight">Taylor</h4>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[7px] sm:text-[8px] font-black text-blue-400 uppercase tracking-widest">Concierge</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button onClick={() => setIsOpen(false)} className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all">
                <i className="fas fa-minus text-[10px] sm:text-xs"></i>
              </button>
              <button onClick={() => setShowConfirmClose(true)} className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:text-white hover:bg-red-500 transition-all">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>

          {/* Compact Confirmation */}
          {showConfirmClose && (
            <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl p-6 text-center max-w-[280px] w-full shadow-2xl">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-xl mx-auto mb-4">
                  <i className="fas fa-power-off"></i>
                </div>
                <h3 className="text-base font-black text-slate-900 mb-2">End Session?</h3>
                <p className="text-slate-500 text-[10px] font-medium mb-6 leading-relaxed">Closing will reset Taylor's memory of this conversation.</p>
                <div className="space-y-2">
                  <button onClick={confirmClose} className="w-full bg-red-500 text-white font-black py-3 rounded-xl text-[9px] uppercase tracking-widest hover:bg-red-600 transition-all">End Session</button>
                  <button onClick={() => setShowConfirmClose(false)} className="w-full bg-slate-100 text-slate-500 font-black py-3 rounded-xl text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all">Stay</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden flex flex-col bg-white">
            {step === 'register' && (
              <div className="p-6 sm:p-8 h-full flex flex-col justify-center text-center">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-4">
                  <i className="fas fa-key"></i>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mb-2 leading-tight">Market Access</h3>
                <p className="text-slate-400 text-[10px] font-medium mb-6">Start your 7-day perfect match trial with a dedicated concierge.</p>
                <form onSubmit={handleRegister} className="space-y-3">
                  <input 
                    required type="text" placeholder="Full Name" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                    value={user.name} onChange={e => setUser({...user, name: e.target.value})}
                  />
                  <input 
                    required type="email" placeholder="Email Address" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                    value={user.email} onChange={e => setUser({...user, email: e.target.value})}
                  />
                  <button type="submit" className="w-full bg-slate-900 text-white font-black py-3.5 rounded-xl text-[9px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 mt-2">Unlock Access</button>
                </form>
              </div>
            )}

            {step === 'select' && (
              <div className="p-6 sm:p-8 h-full flex flex-col justify-center space-y-3">
                <div className="text-center mb-4">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Access Granted.</h3>
                  <p className="text-slate-400 text-[10px] font-medium mt-1">Choose interaction mode:</p>
                </div>
                <button onClick={initializeChat} className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-left hover:border-blue-200 hover:bg-blue-50/50 transition-all group flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0"><i className="fas fa-comment-dots text-sm"></i></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-900 uppercase">Text Chat</p>
                    <p className="text-[8px] font-bold text-slate-400">Messaging interface</p>
                  </div>
                </button>
                <button onClick={startVoiceMode} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:bg-blue-600 transition-all group flex items-center space-x-4 shadow-xl shadow-blue-100/30">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white flex-shrink-0"><i className="fas fa-microphone-lines text-sm"></i></div>
                  <div>
                    <p className="text-[10px] font-black text-white uppercase">Voice Call</p>
                    <p className="text-[8px] font-bold text-blue-300">Speak with Taylor</p>
                  </div>
                </button>
              </div>
            )}

            {step === 'chat' && (
              <div className="h-full flex flex-col overflow-hidden">
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20 custom-scrollbar">
                  {messages.length === 0 && (
                    <div className="bg-white border border-slate-100 p-3 rounded-xl rounded-tl-none shadow-sm max-w-[85%]">
                      <p className="text-[10px] font-bold text-slate-700 leading-relaxed">
                        Hi {user.name.split(' ')[0]}! I'm tracking every listing in Tampa for your trial. What areas are we exploring?
                      </p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`max-w-[85%] p-3 rounded-xl shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'}`}>
                        <p className="text-[10px] font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <p className="text-[6px] font-black uppercase mt-1 opacity-50 text-right">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                  {isTaylorTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-100 p-2.5 rounded-xl rounded-tl-none flex items-center space-x-1">
                        <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  )}
                </div>
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex items-center space-x-2">
                  <input 
                    type="text" value={input} onChange={(e) => setInput(e.target.value)}
                    placeholder="Search Tampa areas..." 
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none focus:border-blue-500 transition-all" 
                  />
                  <button type="submit" disabled={!input.trim() || isTaylorTyping} className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg disabled:opacity-50 transition-all hover:bg-blue-600">
                    <i className="fas fa-arrow-right text-[10px]"></i>
                  </button>
                </form>
              </div>
            )}

            {step === 'voice' && (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-6">
                <div className="relative">
                  <div className={`absolute -inset-8 bg-blue-500 rounded-full blur-2xl opacity-10 transition-all duration-700 ${isTaylorSpeaking ? 'scale-125 animate-pulse' : 'scale-100'}`}></div>
                  <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-slate-100 flex items-center justify-center bg-white shadow-xl relative z-10 ${isTaylorSpeaking ? 'scale-105' : ''}`}>
                    <i className={`fas fa-microphone-lines text-2xl sm:text-3xl ${status === ConnectionStatus.CONNECTED ? 'text-blue-600' : 'text-slate-300'}`}></i>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">{status === ConnectionStatus.CONNECTED ? "Taylor Online" : "Connecting..."}</h3>
                  <div className="flex items-center justify-center mt-1.5 space-x-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Live Stream</p>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-1 h-8 w-full">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className={`w-1 rounded-full transition-all duration-150 ${isTaylorSpeaking ? 'bg-blue-600' : 'bg-slate-200'}`} style={{ height: isTaylorSpeaking ? `${Math.max(4, Math.random() * 24)}px` : '4px' }}></div>
                  ))}
                </div>
                <button onClick={() => { if (sessionRef.current) sessionRef.current.close(); setStep('select'); }} className="text-[8px] font-black uppercase text-red-500 hover:text-white hover:bg-red-500 transition-all tracking-widest bg-red-50 px-6 py-2.5 rounded-xl border border-red-100">End Call</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-900 text-white rounded-2xl shadow-xl flex flex-col items-center justify-center hover:scale-105 transition-all group relative overflow-hidden" aria-label="Connect with Taylor">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/0 to-blue-600/10 group-hover:to-blue-600/20"></div>
          <i className="fas fa-headset text-xl sm:text-2xl mb-1 relative z-10"></i>
          <span className="text-[7px] font-black uppercase tracking-widest opacity-60 relative z-10">AI Chat</span>
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full"></span>
        </button>
      )}
    </div>
  );
};

export default TaylorChatbot;

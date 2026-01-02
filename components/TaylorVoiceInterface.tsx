
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { TAYLOR_SYSTEM_INSTRUCTION, MARKET_STATS } from '../constants';
import { Message, ConnectionStatus } from '../types';

// Tool Definitions
const getMarketDataTool: FunctionDeclaration = {
  name: 'get_market_data',
  parameters: {
    type: Type.OBJECT,
    description: 'Get real-time market data for a specific neighborhood in Tampa.',
    properties: {
      neighborhood: {
        type: Type.STRING,
        description: 'The name of the neighborhood (e.g., South Tampa, Brandon, Westchase).',
      },
    },
    required: ['neighborhood'],
  },
};

const bookShowingTool: FunctionDeclaration = {
  name: 'book_showing',
  parameters: {
    type: Type.OBJECT,
    description: 'Coordinate a property walkthrough for the client.',
    properties: {
      propertyAddress: {
        type: Type.STRING,
        description: 'The address or description of the property to view.',
      },
      preferredTime: {
        type: Type.STRING,
        description: 'The client\'s suggested time/date for the walkthrough.',
      },
      type: {
        type: Type.STRING,
        enum: ['Physical', 'Virtual'],
        description: 'Whether the walkthrough is in-person or remote.',
      },
    },
    required: ['propertyAddress', 'preferredTime', 'type'],
  },
};

// Utility functions for audio processing
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const TaylorVoiceInterface: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTaylorSpeaking, setIsTaylorSpeaking] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{
    input: AudioContext | null;
    output: AudioContext | null;
  }>({ input: null, output: null });
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const transcriptionRef = useRef<{ user: string; model: string }>({ user: '', model: '' });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentTranscription]);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (audioContextsRef.current.input) audioContextsRef.current.input.suspend();
    if (audioContextsRef.current.output) audioContextsRef.current.output.suspend();

    setStatus(ConnectionStatus.DISCONNECTED);
    setIsTaylorSpeaking(false);
  }, []);

  const startSession = async () => {
    if (!process.env.API_KEY) return;

    setStatus(ConnectionStatus.CONNECTING);
    setMessages([]);

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
          tools: [{ functionDeclarations: [getMarketDataTool, bookShowingTool] }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: TAYLOR_SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setStatus(ConnectionStatus.CONNECTED);
            const source = audioContextsRef.current.input!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextsRef.current.input!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextsRef.current.input!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Function Call Handling
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                let response = {};
                if (fc.name === 'get_market_data') {
                  const neighborhood = (fc.args as any).neighborhood;
                  const data = MARKET_STATS.find(s => s.area.toLowerCase().includes(neighborhood.toLowerCase()));
                  response = data ? data : { error: "Neighborhood data not found in current daily track." };
                } else if (fc.name === 'book_showing') {
                  response = { status: "success", confirmation: "Walkthrough request logged with the area manager." };
                }
                
                sessionPromise.then(session => {
                  session.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response }
                  });
                });
              }
            }

            // Audio/Transcription Handling
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsTaylorSpeaking(true);
              const outputCtx = audioContextsRef.current.output!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsTaylorSpeaking(false);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.inputTranscription) {
              transcriptionRef.current.user += message.serverContent.inputTranscription.text;
              setCurrentTranscription(`You: ${transcriptionRef.current.user}`);
            }
            if (message.serverContent?.outputTranscription) {
              transcriptionRef.current.model += message.serverContent.outputTranscription.text;
              setCurrentTranscription(`Taylor: ${transcriptionRef.current.model}`);
            }

            if (message.serverContent?.turnComplete) {
              const uText = transcriptionRef.current.user;
              const mText = transcriptionRef.current.model;
              setMessages(prev => [
                ...prev,
                ...(uText ? [{ role: 'user' as const, text: uText, timestamp: new Date() }] : []),
                ...(mText ? [{ role: 'assistant' as const, text: mText, timestamp: new Date() }] : []),
              ]);
              transcriptionRef.current = { user: '', model: '' };
              setCurrentTranscription('');
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsTaylorSpeaking(false);
            }
          },
          onerror: (e) => setStatus(ConnectionStatus.ERROR),
          onclose: () => setStatus(ConnectionStatus.DISCONNECTED),
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      setStatus(ConnectionStatus.ERROR);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
      {/* Visual Status Indicator */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <div className="relative group cursor-pointer">
            <div className={`absolute -inset-1 rounded-full blur opacity-25 transition duration-1000 group-hover:duration-200 ${isTaylorSpeaking ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
            <img 
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&h=200&auto=format&fit=crop" 
              className="relative w-14 h-14 rounded-full border-4 border-white shadow-md object-cover grayscale-[0.3]"
              alt="Taylor"
            />
            {status === ConnectionStatus.CONNECTED && (
              <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-4 border-white ${isTaylorSpeaking ? 'bg-green-500 animate-pulse' : 'bg-green-500'}`}></span>
            )}
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-lg leading-tight">Taylor</h2>
            <div className="flex items-center">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>
               <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                {status === ConnectionStatus.CONNECTED ? 'Active Market Analyst' : 'Concierge Offline'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          {status === ConnectionStatus.CONNECTED ? (
            <button 
              onClick={stopSession}
              className="bg-red-50 text-red-600 hover:bg-red-100 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center border border-red-100"
            >
              <i className="fas fa-phone-slash mr-2"></i> End Session
            </button>
          ) : (
            <button 
              onClick={startSession}
              disabled={status === ConnectionStatus.CONNECTING}
              className="bg-slate-900 text-white hover:bg-blue-700 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center shadow-xl shadow-slate-200 disabled:opacity-50"
            >
              {status === ConnectionStatus.CONNECTING ? (
                <>
                  <i className="fas fa-circle-notch fa-spin mr-2"></i> Initializing...
                </>
              ) : (
                <>
                  <i className="fas fa-microphone mr-2"></i> Start Call
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Chat Display */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-6 bg-[radial-gradient(#f1f5f9_1px,transparent_1px)] [background-size:20px_20px] custom-scrollbar"
      >
        {messages.length === 0 && !currentTranscription && status !== ConnectionStatus.CONNECTED && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-10">
             <div className="relative">
                <div className="absolute inset-0 bg-blue-100 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                <div className="relative w-24 h-24 bg-white shadow-xl rounded-3xl flex items-center justify-center text-3xl text-blue-600 border border-slate-50">
                  <i className="fas fa-headset"></i>
                </div>
             </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">Expert Consultation <br/>Ready When You Are</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto mt-3 font-medium">
                Tap 'Start Call' to discuss the latest Tampa market trends, neighborhoods, and schedule property viewings.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 max-w-lg">
              {['"What\'s the inventory in South Tampa?"', '"Book a viewing for Westchase"', '"Explain local price comps"'].map((tip, idx) => (
                <span key={idx} className="bg-white px-4 py-2.5 rounded-2xl border border-slate-100 text-[10px] font-bold text-slate-500 shadow-sm hover:border-blue-200 transition-colors cursor-pointer">
                  {tip}
                </span>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[80%] rounded-3xl px-6 py-4 shadow-sm relative ${
              msg.role === 'user' 
                ? 'bg-slate-900 text-white rounded-tr-none font-medium' 
                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none font-semibold leading-relaxed'
            }`}>
              <p className="text-sm">{msg.text}</p>
              <span className={`text-[8px] absolute -bottom-5 font-black uppercase tracking-tighter ${msg.role === 'user' ? 'right-2 text-slate-400' : 'left-2 text-blue-400'}`}>
                {msg.role === 'user' ? 'Client' : 'Taylor AI'} &bull; {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}

        {currentTranscription && (
          <div className={`flex ${currentTranscription.startsWith('You:') ? 'justify-end' : 'justify-start'} opacity-60`}>
            <div className={`max-w-[80%] rounded-3xl px-6 py-4 text-sm font-bold italic ${
              currentTranscription.startsWith('You:')
                ? 'bg-slate-900 text-white rounded-tr-none' 
                : 'bg-white border border-slate-200 text-slate-400 rounded-tl-none'
            }`}>
              {currentTranscription.split(': ')[1]}
              <span className="ml-2 inline-flex gap-0.5">
                <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-1 bg-current rounded-full animate-bounce"></span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modern Waveform visualizer */}
      <div className="h-28 bg-white border-t border-slate-50 flex flex-col items-center justify-center relative overflow-hidden px-10">
        {status === ConnectionStatus.CONNECTED ? (
          <>
            <div className="flex items-center space-x-1.5 h-12 z-10">
              {[...Array(24)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-1 rounded-full transition-all duration-200 ${isTaylorSpeaking ? 'bg-blue-600' : 'bg-slate-200'}`}
                  style={{ 
                    height: isTaylorSpeaking ? `${Math.max(4, Math.random() * 40)}px` : '4px',
                    opacity: isTaylorSpeaking ? 1 : 0.5
                  }}
                />
              ))}
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">
              Real-Time Analysis Stream <span className="text-blue-500 ml-2">Live</span>
            </p>
          </>
        ) : (
          <div className="text-center opacity-40">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Awaiting Secure Connection
            </p>
            <div className="w-32 h-0.5 bg-slate-100 mx-auto mt-2 rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaylorVoiceInterface;

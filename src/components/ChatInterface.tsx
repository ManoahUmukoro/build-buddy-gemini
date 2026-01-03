import { useState, useEffect, useRef } from 'react';
import { Sparkles, User, Loader2, Mic, MicOff, Volume2, Send, Paperclip, X, StopCircle, Image as ImageIcon, Bot } from 'lucide-react';
import { formatText } from '@/lib/formatters';
import { ChatMessage } from '@/lib/types';

interface ChatInterfaceProps {
  history: ChatMessage[];
  onSend: (text: string, imageBase64: string | null) => void;
  isLoading: boolean;
  placeholder?: string;
  personaName?: string;
  personaType?: 'nexer' | 'meyra' | 'buddy';
}

export function ChatInterface({ 
  history, 
  onSend, 
  isLoading, 
  placeholder = "Type a message...", 
  personaName = "Buddy",
  personaType = 'buddy'
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isLoading]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes('Google US English')) 
        || voices.find(v => v.name.includes('Zira')) 
        || voices.find(v => v.lang.startsWith('en-US')) 
        || voices[0];
      setSelectedVoice(preferred || null);
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice input not supported. Try Chrome!");
      return;
    }
    
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (e: any) => {
      let newTranscript = "";
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          newTranscript += e.results[i][0].transcript;
        }
      }
      if (newTranscript) {
        setInput(prev => {
          const spacer = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
          return prev + spacer + newTranscript;
        });
      }
    };

    recognition.start();
  };

  const speakLastMessage = () => {
    window.speechSynthesis.cancel();
    const lastMsg = history.filter(m => m.role === 'model').pop();
    if (lastMsg) {
      const safeText = typeof lastMsg.text === 'string' ? lastMsg.text : JSON.stringify(lastMsg.text);
      const utterance = new SpeechSynthesisUtterance(safeText.replace(/[*_#]/g, ''));
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setUploadedImage(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !uploadedImage) return;
    onSend(input, uploadedImage);
    setInput("");
    setUploadedImage(null);
  };

  // Persona-specific styling
  const getPersonaStyles = () => {
    switch (personaType) {
      case 'nexer':
        return {
          iconBg: 'bg-success/10 border-success/20',
          iconColor: 'text-success',
          name: personaName || 'Nexer',
        };
      case 'meyra':
        return {
          iconBg: 'bg-pink-500/10 border-pink-500/20',
          iconColor: 'text-pink-500',
          name: personaName || 'Meyra',
        };
      default:
        return {
          iconBg: 'bg-primary/10 border-primary/20',
          iconColor: 'text-primary',
          name: personaName || 'Buddy',
        };
    }
  };

  const personaStyles = getPersonaStyles();

  return (
    <div className="flex flex-col h-[60dvh] md:h-[60vh] max-w-full overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 p-2 pb-safe">
        {history.length === 0 && (
          <div className="text-center text-muted-foreground mt-12 md:mt-20 text-sm px-4">
            <div className={`w-12 h-12 mx-auto mb-3 rounded-full ${personaStyles.iconBg} flex items-center justify-center border`}>
              {personaType === 'nexer' ? (
                <Bot size={24} className={personaStyles.iconColor} />
              ) : personaType === 'meyra' ? (
                <Sparkles size={24} className={personaStyles.iconColor} />
              ) : (
                <Sparkles size={24} className={personaStyles.iconColor} />
              )}
            </div>
            <p className="font-medium text-foreground mb-1">{personaStyles.name}</p>
            <p className="text-xs">
              {personaType === 'nexer' 
                ? "Your financial advisor. Ask about budgets, savings, and spending insights."
                : personaType === 'meyra'
                ? "Your journaling companion. Share your thoughts and feelings."
                : "Start a conversation."
              }
            </p>
          </div>
        )}
        {history.map((msg, idx) => (
          <div key={`${msg.role}-${idx}`} className={`flex gap-2 md:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${personaStyles.iconBg} flex items-center justify-center shrink-0 border`}>
                <Sparkles size={14} className={`md:w-4 md:h-4 ${personaStyles.iconColor}`} />
              </div>
            )}
            <div className={`max-w-[85%] md:max-w-[80%] p-3 md:p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-soft ${
              msg.role === 'user' 
                ? 'bg-secondary text-secondary-foreground rounded-tr-none' 
                : 'bg-card border border-border text-card-foreground rounded-tl-none'
            }`}>
              {formatText(msg.text)}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User size={14} className="md:w-4 md:h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2 md:gap-3 justify-start">
            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${personaStyles.iconBg} flex items-center justify-center shrink-0`}>
              <Sparkles size={14} className={`md:w-4 md:h-4 ${personaStyles.iconColor}`} />
            </div>
            <div className="bg-card border border-border p-3 md:p-4 rounded-2xl rounded-tl-none shadow-soft">
              <Loader2 className="animate-spin text-muted-foreground" size={16} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      
      <div className="border-t border-border pt-3 md:pt-4 mt-2 pb-safe">
        {uploadedImage && (
          <div className="flex items-center gap-2 mb-2 md:mb-3 bg-primary/10 p-2 rounded-lg text-xs text-primary w-fit border border-primary/20">
            <ImageIcon size={14} /> Image attached
            <button type="button" onClick={() => setUploadedImage(null)}>
              <X size={14} />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-1.5 md:gap-2 items-end">
          <label className="p-2.5 md:p-3 text-muted-foreground hover:bg-muted rounded-xl cursor-pointer transition-colors">
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <Paperclip size={18} className="md:w-5 md:h-5" />
          </label>
          <button 
            type="button" 
            onClick={toggleListening} 
            className={`p-2.5 md:p-3 rounded-xl transition-colors ${
              isListening 
                ? 'bg-destructive/10 text-destructive animate-pulse ring-1 ring-destructive/20' 
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {isListening ? <MicOff size={18} className="md:w-5 md:h-5" /> : <Mic size={18} className="md:w-5 md:h-5" />}
          </button>
          <input 
            className="flex-1 p-2.5 md:p-3 bg-muted border-0 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground text-foreground text-sm" 
            placeholder={placeholder} 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            disabled={isLoading} 
          />
          {isSpeaking ? (
            <button 
              type="button" 
              onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false); }} 
              className="p-2.5 md:p-3 text-destructive hover:bg-destructive/10 rounded-xl transition-colors animate-pulse"
            >
              <StopCircle size={18} className="md:w-5 md:h-5" />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={speakLastMessage} 
              className="p-2.5 md:p-3 text-muted-foreground hover:bg-muted rounded-xl transition-colors hidden sm:block"
            >
              <Volume2 size={18} className="md:w-5 md:h-5" />
            </button>
          )}
          <button 
            type="submit" 
            disabled={isLoading || (!input.trim() && !uploadedImage)} 
            className="bg-secondary text-secondary-foreground p-2.5 md:p-3 rounded-xl hover:bg-secondary/80 disabled:opacity-50 transition-colors shadow-soft"
          >
            <Send size={18} className="md:w-5 md:h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Sparkles, User, Loader2, Mic, MicOff, Volume2, Send, Paperclip, X, StopCircle, Image as ImageIcon } from 'lucide-react';
import { formatText } from '@/lib/formatters';
import { ChatMessage } from '@/lib/types';

interface ChatInterfaceProps {
  history: ChatMessage[];
  onSend: (text: string, imageBase64: string | null) => void;
  isLoading: boolean;
  placeholder?: string;
  personaName?: string;
}

export function ChatInterface({ 
  history, 
  onSend, 
  isLoading, 
  placeholder = "Type a message...", 
  personaName = "Buddy" 
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

  return (
    <div className="flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto space-y-6 p-2">
        {history.length === 0 && (
          <div className="text-center text-muted-foreground mt-20 text-sm">
            <p>Start a conversation with {personaName}.</p>
          </div>
        )}
        {history.map((msg, idx) => (
          <div key={`${msg.role}-${idx}`} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <Sparkles size={16} className="text-primary" />
              </div>
            )}
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-soft ${
              msg.role === 'user' 
                ? 'bg-secondary text-secondary-foreground rounded-tr-none' 
                : 'bg-card border border-border text-card-foreground rounded-tl-none'
            }`}>
              {formatText(msg.text)}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User size={16} className="text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-none shadow-soft">
              <Loader2 className="animate-spin text-muted-foreground" size={16} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      
      <div className="border-t border-border pt-4 mt-2">
        {uploadedImage && (
          <div className="flex items-center gap-2 mb-3 bg-primary/10 p-2 rounded-lg text-xs text-primary w-fit border border-primary/20">
            <ImageIcon size={14} /> Image attached
            <button type="button" onClick={() => setUploadedImage(null)}>
              <X size={14} />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <label className="p-3 text-muted-foreground hover:bg-muted rounded-xl cursor-pointer transition-colors">
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <Paperclip size={20} />
          </label>
          <button 
            type="button" 
            onClick={toggleListening} 
            className={`p-3 rounded-xl transition-colors ${
              isListening 
                ? 'bg-destructive/10 text-destructive animate-pulse ring-1 ring-destructive/20' 
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <input 
            className="flex-1 p-3 bg-muted border-0 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground text-foreground" 
            placeholder={placeholder} 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            disabled={isLoading} 
          />
          {isSpeaking ? (
            <button 
              type="button" 
              onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false); }} 
              className="p-3 text-destructive hover:bg-destructive/10 rounded-xl transition-colors animate-pulse"
            >
              <StopCircle size={20} />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={speakLastMessage} 
              className="p-3 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
            >
              <Volume2 size={20} />
            </button>
          )}
          <button 
            type="submit" 
            disabled={isLoading || (!input.trim() && !uploadedImage)} 
            className="bg-secondary text-secondary-foreground p-3 rounded-xl hover:bg-secondary/80 disabled:opacity-50 transition-colors shadow-soft"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

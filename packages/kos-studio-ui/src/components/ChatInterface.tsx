import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ShieldCheck, Zap, AlertCircle, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  status?: 'specifying' | 'executing' | 'verifying' | 'completed' | 'failed';
  verificationScore?: number;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hola, soy el núcleo de KOS. ¿En qué puedo ayudarte hoy? Puedo realizar tareas complejas, analizar datos o ayudarte a gobernar tus procesos de IA.',
      timestamp: Date.now(),
      status: 'completed'
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Simulación del flujo de KOS
    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'specifying'
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Fase 1: Especificación
    await new Promise(r => setTimeout(r, 1500));
    updateMessageStatus(assistantId, 'executing', 'Entendido. Estoy trazando el plan de ejecución para tu solicitud...');

    // Fase 2: Ejecución
    await new Promise(r => setTimeout(r, 2000));
    updateMessageStatus(assistantId, 'verifying', 'Tarea ejecutada. Iniciando fase de verificación de calidad y gobernanza...');

    // Fase 3: Verificación
    await new Promise(r => setTimeout(r, 1500));
    const finalContent = `He completado la tarea solicitada. 
    
He aplicado el Método Karpathy para asegurar que cada paso cumpla con los estándares de seguridad y eficiencia definidos en tu workspace. 

¿Hay algo más que necesites ajustar?`;
    
    setMessages(prev => prev.map(msg => 
      msg.id === assistantId 
        ? { ...msg, content: finalContent, status: 'completed', verificationScore: 98.5 } 
        : msg
    ));
    
    setIsProcessing(false);
  };

  const updateMessageStatus = (id: string, status: Message['status'], content: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, status, content } : msg
    ));
  };

  return (
    <div className="flex flex-col h-full bg-kos-dark">
      {/* Header del Chat */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-kos-primary rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm">KOS Governance Chat</h2>
            <p className="text-xs text-kos-success flex items-center gap-1">
              <span className="w-2 h-2 bg-kos-success rounded-full animate-pulse"></span>
              Control Plane Active
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
            <ShieldCheck className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Lista de Mensajes */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-slate-700' : 'bg-kos-primary'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              
              <div className="space-y-2">
                <div className={`p-4 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-kos-primary text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.role === 'assistant' && msg.status !== 'completed' && msg.status !== 'failed' && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-kos-primary font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="capitalize">{msg.status}...</span>
                    </div>
                  )}
                </div>

                {msg.role === 'assistant' && msg.status === 'completed' && (
                  <div className="flex items-center gap-3 px-2">
                    <div className="flex items-center gap-1 text-[10px] text-kos-success font-bold uppercase tracking-wider">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Score: <span className="text-kos-success">{msg.verificationScore}%</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Zap className="w-3 h-3 text-kos-warning" />
                      1.2s
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-gradient-to-t from-kos-dark to-transparent">
        <div className="max-w-4xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Solicita una tarea o realiza una consulta al Kernel..."
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 pr-14 text-sm focus:outline-none focus:border-kos-primary focus:ring-1 focus:ring-kos-primary transition-all resize-none scrollbar-none"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className={`absolute right-3 bottom-3 p-2 rounded-xl transition-all ${
              input.trim() && !isProcessing 
                ? 'bg-kos-primary text-white hover:scale-105' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-500 mt-3">
          KOS Governance Kernel v0.2.0 • Todas las respuestas son verificadas por el motor de gobernanza.
        </p>
      </div>
    </div>
  );
}

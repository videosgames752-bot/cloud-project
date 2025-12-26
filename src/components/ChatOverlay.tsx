import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: number;
  isHost: boolean;
}

interface ChatOverlayProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentUserName: string;
  hasUnread?: boolean;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({ 
  messages, 
  onSendMessage, 
  isOpen, 
  setIsOpen,
  currentUserName,
  hasUnread
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-50 p-3 rounded-full backdrop-blur-md shadow-lg transition-all ${
          isOpen 
            ? 'bottom-24 right-4 bg-red-500/20 text-red-400 border border-red-500/30' 
            : 'bottom-4 right-4 bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30'
        }`}
      >
        {isOpen ? <X size={24} /> : (
          <div className="relative">
            <MessageSquare size={24} />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
        )}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-4 w-80 md:w-96 h-96 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl z-40 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <MessageSquare size={18} className="text-sky-400" />
                Room Chat
              </h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="text-center text-slate-500 text-sm mt-10">
                  No messages yet.<br/>Say hello!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderName === currentUserName;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`text-[10px] mb-1 px-1 ${isMe ? 'text-sky-300' : 'text-slate-400'}`}>
                        {isMe ? 'You' : msg.senderName} {msg.isHost && <span className="text-purple-400 font-bold">(Host)</span>}
                      </div>
                      <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm break-words ${
                        isMe 
                          ? 'bg-sky-600 text-white rounded-tr-sm' 
                          : 'bg-white/10 text-slate-200 rounded-tl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 bg-black/20 border-t border-white/5 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50"
              />
              <button 
                type="submit"
                disabled={!inputText.trim()}
                className="p-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

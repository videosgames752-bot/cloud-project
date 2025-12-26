import React, { useState } from 'react';
import Host from './pages/Host';
import Client from './pages/Client';
import { Monitor, Smartphone, Gamepad2, User, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [mode, setMode] = useState<'name' | 'home' | 'host' | 'client'>('name');
  const [userName, setUserName] = useState('');

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim().length > 0) {
      setMode('home');
    }
  };

  return (
    // Changed overflow-hidden to overflow-y-auto to allow scrolling on mobile
    <div className="min-h-screen flex flex-col relative overflow-y-auto overflow-x-hidden">
      {/* Background Ambient Orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-sky-500/20 rounded-full blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {mode === 'name' && (
          <motion.div
            key="name"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            className="flex-1 flex items-center justify-center p-4 z-10 min-h-screen"
          >
            <div className="w-full max-w-md glass-panel p-8 rounded-3xl text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-50" />
               
               <div className="w-20 h-20 mx-auto bg-sky-500/10 rounded-full flex items-center justify-center mb-6 border border-sky-500/20 shadow-[0_0_30px_rgba(14,165,233,0.2)]">
                  <User className="w-10 h-10 text-sky-400" />
               </div>

               <h1 className="text-3xl font-bold text-white mb-2">Welcome</h1>
               <p className="text-slate-400 mb-8">Please identify yourself to continue.</p>

               <form onSubmit={handleNameSubmit} className="space-y-4">
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your name..."
                      className="w-full bg-black/30 border border-white/10 text-white text-center text-xl font-medium py-4 rounded-2xl focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all placeholder-white/20"
                      autoFocus
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={!userName.trim()}
                    className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-sky-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                  >
                    Continue <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
               </form>
            </div>
          </motion.div>
        )}

        {mode === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex-1 flex items-center justify-center p-4 z-10 min-h-screen"
          >
            <div className="max-w-4xl w-full text-center py-10">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="inline-flex items-center justify-center p-3 mb-6 rounded-2xl bg-sky-500/10 border border-sky-500/20 shadow-[0_0_30px_rgba(14,165,233,0.3)]">
                  <Gamepad2 className="w-8 h-8 text-sky-400 mr-2" />
                  <span className="text-sky-300 font-bold tracking-wider text-sm uppercase">Cloud Gaming Protocol</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
                  <span className="text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]">
                    Yugo Cloud Play
                  </span>
                </h1>
                
                <p className="text-slate-400 text-lg md:text-xl mb-4 max-w-2xl mx-auto leading-relaxed">
                  Hello, <span className="text-sky-400 font-bold">{userName}</span>.
                </p>
                <p className="text-slate-500 text-sm md:text-base mb-12 max-w-2xl mx-auto leading-relaxed">
                  Ultra-low latency remote desktop streaming. <br/>
                  Turn any device into a controller.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto px-4">
                <motion.button
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode('host')}
                  className="glass-card group relative p-6 md:p-8 rounded-3xl text-left overflow-hidden w-full"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-12">
                    <Monitor size={140} />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center mb-4 md:mb-6 shadow-lg shadow-sky-500/20 group-hover:shadow-sky-500/40 transition-shadow">
                      <Monitor className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3 text-white group-hover:text-sky-200 transition-colors">Host Game</h2>
                    <p className="text-sm md:text-base text-slate-400 group-hover:text-slate-300 transition-colors">Stream your PC screen and receive inputs.</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode('client')}
                  className="glass-card group relative p-6 md:p-8 rounded-3xl text-left overflow-hidden w-full"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-12">
                    <Smartphone size={140} />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 md:mb-6 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                      <Smartphone className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3 text-white group-hover:text-blue-200 transition-colors">Join Controller</h2>
                    <p className="text-sm md:text-base text-slate-400 group-hover:text-slate-300 transition-colors">Use your phone as a virtual gamepad.</p>
                  </div>
                </motion.button>
              </div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 md:mt-16 pb-8"
              >
                <div className="inline-block glass-panel px-6 py-3 rounded-full text-slate-400 text-xs md:text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2 animate-pulse"></span>
                  Server Required: <code className="text-sky-400 ml-2 font-mono">node server/index.js</code>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {mode === 'host' && (
          <motion.div key="host" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full flex-1">
             <Host userName={userName} />
             <button onClick={() => setMode('home')} className="fixed top-6 right-6 z-50 text-slate-400 hover:text-white transition-colors bg-black/50 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">Exit</button>
          </motion.div>
        )}
        
        {mode === 'client' && (
          <motion.div key="client" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full flex-1">
            <Client userName={userName} onExit={() => setMode('home')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

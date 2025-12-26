import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../utils/socket';
import { getIceServers, ControlInput } from '../utils/webrtc';
import { v4 as uuidv4 } from 'uuid';
import { Monitor, Copy, Gamepad2, Users, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatOverlay, ChatMessage } from '../components/ChatOverlay';

interface HostProps {
  userName: string;
}

interface ConnectedClient {
  id: string;
  name: string;
}

export default function Host({ userName }: HostProps) {
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState('idle');
  const [lastInput, setLastInput] = useState<ControlInput | null>(null);
  const [clients, setClients] = useState<ConnectedClient[]>([]);
  const [axes, setAxes] = useState<{[key: number]: number}>({0:0, 1:0, 2:0, 3:0});
  
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadChat, setUnreadChat] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map());
  const localStream = useRef<MediaStream | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const id = uuidv4().slice(0, 6).toUpperCase();
    setRoomId(id);
    const onConnect = () => {
      socket.emit('create-room', id);
      setStatus('waiting');
    };

    const onClientJoined = async (client: ConnectedClient) => {
      setClients(prev => [...prev, client]);
      await startWebRTC(client.id);
    };

    const onClientLeft = (clientId: string) => {
      setClients(prev => prev.filter(c => c.id !== clientId));
      cleanupConnection(clientId);
    };

    const onChatMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      if (!chatOpen) setUnreadChat(true);
    };

    const onAnswer = async ({ answer, sender }: any) => {
      const pc = peerConnections.current.get(sender);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const onIceCandidate = async ({ candidate, sender }: any) => {
      const pc = peerConnections.current.get(sender);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    socket.on('connect', onConnect);

    if (!socket.connected) socket.connect();

    socket.on('client-joined', onClientJoined);
    socket.on('client-left', onClientLeft);
    socket.on('chat-message', onChatMessage);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIceCandidate);

    return () => {
      // remove only listeners attached here; keep global socket connected
      socket.off('connect', onConnect);
      socket.off('client-joined', onClientJoined);
      socket.off('client-left', onClientLeft);
      socket.off('chat-message', onChatMessage);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIceCandidate);

      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      dataChannels.current.clear();
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
      audioRefs.current.forEach(audio => audio.remove());
      audioRefs.current.clear();
    };
  }, []);

  useEffect(() => {
    if (chatOpen) setUnreadChat(false);
  }, [chatOpen]);

  const cleanupConnection = (clientId: string) => {
    const pc = peerConnections.current.get(clientId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(clientId);
    }
    dataChannels.current.delete(clientId);
    const audio = audioRefs.current.get(clientId);
    if (audio) {
        audio.remove();
        audioRefs.current.delete(clientId);
    }
    if (peerConnections.current.size === 0) {
        setStatus('waiting');
    }
  };

  const kickClient = (clientId: string) => {
    socket.emit('kick-client', { clientId, roomId });
    setClients(prev => prev.filter(c => c.id !== clientId));
    cleanupConnection(clientId);
  };

  const sendChatMessage = (text: string) => {
    socket.emit('chat-message', { roomId, message: text, senderName: userName });
  };

  const startStream = async () => {
    if (localStream.current) return localStream.current;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } },
        audio: true
      });
      localStream.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error("Error sharing screen:", err);
      return null;
    }
  };

  const startWebRTC = async (targetClientId: string) => {
    const stream = await startStream();
    if (!stream) return;

    // --- UPDATED: Get ICE servers dynamically ---
    const iceConfig = await getIceServers();
    const pc = new RTCPeerConnection(iceConfig);
    peerConnections.current.set(targetClientId, pc);

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (event.track.kind === 'audio') {
        let audio = audioRefs.current.get(targetClientId);
        if (!audio) {
            audio = new Audio();
            audio.autoplay = true;
            audioRefs.current.set(targetClientId, audio);
        }
        audio.srcObject = event.streams[0];
      }
    };

    const dc = pc.createDataChannel("controls", { ordered: false, maxRetransmits: 0 });
    dataChannels.current.set(targetClientId, dc);
    
    dc.onopen = () => setStatus('connected');
    dc.onmessage = (e) => {
      const data = JSON.parse(e.data) as ControlInput;
      setLastInput(data);
      if (data.type === 'gamepad' && data.inputType === 'axis') {
        setAxes(prev => ({ ...prev, [data.index!]: data.value }));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { candidate: event.candidate, roomId, target: targetClientId });
      }
    };

    // ensure we only create/send one offer per connection
    let negotiationStarted = false;
    const doOffer = async () => {
      if (negotiationStarted) return;
      negotiationStarted = true;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { offer, roomId, target: targetClientId });
      } catch (e) {
        console.error('Failed to create/send offer', e);
      }
    };
    pc.onnegotiationneeded = doOffer;

    // explicitly start negotiation once handlers are attached
    await doOffer();
  };

  const renderInputVisual = () => {
    if (!lastInput && status === 'connected') return <span className="text-slate-600 italic">Waiting for input...</span>;
    if (!lastInput) return <span className="text-slate-600 italic">Waiting for connection...</span>;

    return (
      <div className="w-full h-full p-4 flex flex-col items-center justify-center">
        <div className="relative w-64 h-40 bg-slate-800/50 rounded-3xl border border-white/10 shadow-inner mb-4">
           <div className="absolute top-12 left-8 w-12 h-12 rounded-full border border-white/20 bg-black/30 flex items-center justify-center">
              <div className="w-6 h-6 bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)] transition-transform duration-75"
                style={{ transform: `translate(${axes[0] * 15}px, ${axes[1] * 15}px)` }} />
           </div>
           <div className="absolute top-12 right-8 w-12 h-12 rounded-full border border-white/20 bg-black/30 flex items-center justify-center">
              <div className="w-6 h-6 bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)] transition-transform duration-75"
                style={{ transform: `translate(${axes[2] * 15}px, ${axes[3] * 15}px)` }} />
           </div>
           {lastInput.type === 'gamepad' && lastInput.inputType === 'button' && lastInput.value === 1 && (
             <motion.div key={lastInput.code} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
               {lastInput.code}
             </motion.div>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-8 flex flex-col">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="glass-panel p-8 rounded-3xl relative">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
              <Monitor className="text-sky-400" /> Host Console
            </h1>
            <div>
              <label className="text-sky-200/60 text-xs font-bold uppercase tracking-wider mb-2 block">Session Code</label>
              <div className="flex gap-3">
                <div className="flex-1 bg-black/40 backdrop-blur-sm p-4 rounded-xl border border-sky-500/20 flex items-center justify-center relative group">
                  <code className="text-3xl font-mono font-bold tracking-[0.2em] text-sky-400 text-glow">{roomId || '...'}</code>
                </div>
                <button onClick={() => navigator.clipboard.writeText(roomId)} className="p-4 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 rounded-xl transition-all active:scale-95"><Copy size={24} /></button>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3 p-4 bg-black/20 rounded-xl border border-white/5">
                <div className={`w-3 h-3 rounded-full ${clients.length > 0 ? 'bg-green-400' : 'bg-amber-400'} ${clients.length > 0 && 'animate-pulse'}`} />
                <span className="capitalize text-sm font-medium text-slate-300">Status: <span className="text-white">{clients.length > 0 ? 'Active' : 'Waiting'}</span></span>
            </div>
          </motion.div>

          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-3xl flex-col max-h-[300px] overflow-y-auto custom-scrollbar">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-200 sticky top-0 bg-slate-900/0 backdrop-blur-sm z-10">
              <Users className="text-blue-400" /> Participants ({clients.length})
            </h2>
            <div className="space-y-3">
                <AnimatePresence>
                    {clients.map(client => (
                        <motion.div key={client.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">{client.name.charAt(0).toUpperCase()}</div>
                                <div className="flex flex-col"><span className="text-sm font-bold text-white">{client.name}</span></div>
                            </div>
                            <button onClick={() => kickClient(client.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
          </motion.div>

          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="glass-panel p-6 rounded-3xl flex-1 flex flex-col">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-200"><Gamepad2 className="text-purple-400" /> Input Visualizer</h2>
            <div className="flex-1 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden">{renderInputVisual()}</div>
          </motion.div>
        </div>

        <div className="lg:col-span-8 h-full min-h-[500px]">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-3 rounded-3xl h-full flex flex-col border-sky-500/10 shadow-2xl shadow-black/50">
            <div className="flex-1 bg-black rounded-2xl overflow-hidden relative flex items-center justify-center">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
              {status === 'waiting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="w-16 h-16 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin mb-4" />
                  <p className="text-slate-400 font-light">Waiting for client connection...</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      
      <ChatOverlay 
        messages={messages} 
        onSendMessage={sendChatMessage} 
        isOpen={chatOpen} 
        setIsOpen={setChatOpen} 
        currentUserName={userName}
        hasUnread={unreadChat}
      />
    </div>
  );
}

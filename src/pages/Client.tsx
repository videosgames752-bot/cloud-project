import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../utils/socket';
import { getIceServers, ControlInput } from '../utils/webrtc';
import { VirtualGamepad } from '../components/VirtualGamepad';
import { Wifi, WifiOff, ArrowRight, AlertCircle, RotateCcw, Loader2, X, UserX, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatOverlay, ChatMessage } from '../components/ChatOverlay';

interface ClientProps {
  userName: string;
  onExit: () => void;
}

export default function Client({ userName, onExit }: ClientProps) {
  const [roomId, setRoomId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(true);
  const [kicked, setKicked] = useState(false);
  
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadChat, setUnreadChat] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const localAudioStream = useRef<MediaStream | null>(null);
  const roomIdRef = useRef(roomId);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    const checkOrientation = () => setIsLandscape(window.innerWidth > window.innerHeight);
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    setIsDesktop(!('ontouchstart' in window || navigator.maxTouchPoints > 0));

    const onRoomJoined = () => {
      setIsConnecting(false);
      setJoined(true);
      setError(null);
      setKicked(false);
    };

    const onError = (msg: any) => {
      setError(msg);
      setIsConnecting(false);
      setJoined(false);
      setIsConnected(false);
    };

    const onKicked = () => {
      setKicked(true);
      setJoined(false);
      setIsConnected(false);
      setIsConnecting(false);
      cleanup();
    };

    const onChatMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      if (!chatOpen) setUnreadChat(true);
    };

    socket.on('room-joined', onRoomJoined);
    socket.on('error', onError);
    socket.on('kicked', onKicked);
    socket.on('chat-message', onChatMessage);

    if (!socket.connected) socket.connect();

    socket.on('offer', async ({ offer, sender }) => {
      // --- UPDATED: Get ICE servers dynamically ---
      const iceConfig = await getIceServers();
      const pc = new RTCPeerConnection(iceConfig);
      peerConnection.current = pc;

      if (localAudioStream.current) {
        localAudioStream.current.getTracks().forEach(track => pc.addTrack(track, localAudioStream.current!));
      }

      pc.ondatachannel = (event) => {
        dataChannel.current = event.channel;
        setIsConnected(true);
      };

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { candidate: event.candidate, roomId: roomIdRef.current, target: sender });
        }
      };
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer', { answer, roomId: roomIdRef.current, target: sender });
    });


    const onIceCandidate = async ({ candidate }: any) => {
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    socket.on('ice-candidate', onIceCandidate);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      // remove only the listeners we attached here so the shared socket remains connected
      socket.off('room-joined', onRoomJoined);
      socket.off('error', onError);
      socket.off('kicked', onKicked);
      socket.off('chat-message', onChatMessage);
      socket.off('offer');
      socket.off('ice-candidate', onIceCandidate);
      // do not call socket.disconnect() here — keep global socket alive
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (peerConnection.current) peerConnection.current.close();
    if (localAudioStream.current) localAudioStream.current.getTracks().forEach(t => t.stop());
    socket.removeAllListeners();
    socket.disconnect();
  };

  useEffect(() => {
    if (chatOpen) setUnreadChat(false);
  }, [chatOpen]);

  const joinRoom = () => {
    if (!roomId) return;
    setError(null);
    setIsConnecting(true);
    setKicked(false);
    if (!socket.connected) socket.connect();
    socket.emit('join-room', { roomId: roomId.toUpperCase(), userName });
  };

  const sendInput = (input: ControlInput) => {
    if (dataChannel.current && dataChannel.current.readyState === 'open') {
      dataChannel.current.send(JSON.stringify(input));
    }
  };

  const sendChatMessage = (text: string) => {
    socket.emit('chat-message', { roomId, message: text, senderName: userName });
  };

  const toggleMic = async () => {
    if (micEnabled) {
        if (localAudioStream.current) {
            localAudioStream.current.getTracks().forEach(t => t.stop());
            localAudioStream.current = null;
        }
        if (peerConnection.current) {
            const senders = peerConnection.current.getSenders();
            senders.forEach(sender => {
                if (sender.track?.kind === 'audio') peerConnection.current?.removeTrack(sender);
            });
        }
        setMicEnabled(false);
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localAudioStream.current = stream;
            
            if (peerConnection.current) {
                stream.getTracks().forEach(track => {
                    peerConnection.current?.addTrack(track, stream);
                });
            }
            setMicEnabled(true);
        } catch (err) {
            console.error("Mic access denied", err);
            alert("Could not access microphone.");
        }
    }
  };

  // NOTE: Previously this returned early and unmounted parts of the UI
  // which could lead to unexpected socket disconnects on some devices.
  // Instead we render the rotate prompt as an overlay in the main JSX below.

  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-y-auto">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md glass-panel p-8 rounded-3xl relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white mb-2">Join Session</h1>
            <p className="text-slate-400">Playing as <span className="text-sky-400 font-bold">{userName}</span></p>
          </div>
          
          <div className="space-y-6">
            <AnimatePresence>
              {kicked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"><UserX size={16} /><span>You were kicked by the host.</span></motion.div>}
              {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"><AlertCircle size={16} /><span>{error}</span></motion.div>}
            </AnimatePresence>

            <input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="A1B2C3" className="w-full bg-black/30 border border-white/10 text-white text-center text-3xl font-mono font-bold py-5 rounded-2xl focus:outline-none focus:border-sky-500/50 uppercase tracking-widest" />
            
            <button onClick={joinRoom} disabled={!roomId || isConnecting} className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2 group">
              {isConnecting ? <Loader2 size={20} className="animate-spin" /> : <>Connect <ArrowRight size={20} /></>}
            </button>
            <button onClick={onExit} className="w-full text-slate-500 hover:text-slate-300 py-2 text-sm">Cancel</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none gamepad-touch-lock">
      {/* Rotate overlay: keep mounted above UI so sockets/datachannels aren't affected */}
      {!isDesktop && !isLandscape && joined && (
        <div className="fixed inset-0 bg-slate-950 z-60 flex flex-col items-center justify-center p-8 text-center">
          <RotateCcw className="w-16 h-16 text-sky-400 mb-6 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-2">Rotate Your Device</h2>
          <p className="text-slate-400 mb-8">Please rotate your phone to landscape mode for the best controller experience.</p>
          <button onClick={onExit} className="px-6 py-2 rounded-full bg-white/10 border border-white/20 text-white">Cancel</button>
        </div>
      )}
      <video ref={remoteVideoRef} autoPlay playsInline muted onClick={() => isDesktop && remoteVideoRef.current?.requestPointerLock()} className={`w-full h-full object-cover ${isDesktop ? 'cursor-none' : ''}`} />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-4 pointer-events-auto">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border shadow-lg ${isConnected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span className="text-xs font-bold tracking-wider">{isConnected ? 'CONNECTED' : 'CONNECTING...'}</span>
        </motion.div>
        
        <button onClick={toggleMic} className={`p-2 rounded-full backdrop-blur-md border transition-all ${micEnabled ? 'bg-sky-500 text-white border-sky-400' : 'bg-black/40 text-white/50 border-white/10'}`}>
            {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
        </button>
      </div>

      {!isDesktop && <button onClick={onExit} className="absolute top-4 right-4 z-50 p-2 bg-black/20 text-white/50 hover:text-white rounded-full backdrop-blur-md pointer-events-auto"><X size={20} /></button>}
      {!isDesktop && <VirtualGamepad onInput={sendInput} />}
      
      <ChatOverlay messages={messages} onSendMessage={sendChatMessage} isOpen={chatOpen} setIsOpen={setChatOpen} currentUserName={userName} hasUnread={unreadChat} />
    </div>
  );
}

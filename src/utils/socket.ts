import { io } from 'socket.io-client';

// During development, prefer connecting to the host that served the page
// so other devices on the LAN can reach the Socket.IO server.
const devHost = (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost')
  ? `http://${window.location.hostname}:3001`
  : 'http://localhost:3001';

const SOCKET_URL = import.meta.env.DEV ? devHost : '/';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.onAny((ev, ...args) => {
  // small runtime log to help debugging connection issues
  // Remove or guard this in production if verbose
  // eslint-disable-next-line no-console
  console.debug('[socket]', ev, ...args);
});

// Log disconnect reason and some page events to help debug mobile orientation issues
socket.on('disconnect', (reason) => {
  const text = 'disconnect: ' + String(reason);
  console.debug('[socket]', text);
  logToOverlay(text);
  postServerLog(text);
});

if (typeof window !== 'undefined') {
  window.addEventListener('orientationchange', () => {
    logToOverlay('orientationchange');
    postServerLog('orientationchange');
  });

  window.addEventListener('visibilitychange', () => {
    logToOverlay('visibilitychange: ' + document.visibilityState);
    postServerLog('visibilitychange: ' + document.visibilityState);
  });

  window.addEventListener('beforeunload', () => {
    logToOverlay('beforeunload');
    postServerLog('beforeunload');
  });
}

// Visual overlay for debug messages when browser console is inaccessible
const ensureOverlay = () => {
  try {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('socket-debug-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'socket-debug-overlay';
      Object.assign(el.style, {
        position: 'fixed',
        bottom: '8px',
        left: '8px',
        zIndex: '999999',
        background: 'rgba(0,0,0,0.6)',
        color: 'white',
        padding: '8px 10px',
        borderRadius: '8px',
        fontSize: '12px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: '40vh',
        overflow: 'auto'
      });
      document.body.appendChild(el);
    }
    return el;
  } catch (e) {
    return null;
  }
};

const logToOverlay = (msg: string) => {
  const el = ensureOverlay();
  if (!el) return;
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.textContent = `[${time}] ${msg}`;
  el.appendChild(line);
  while (el.childNodes.length > 50) el.removeChild(el.firstChild!);
};

// Also send an HTTP POST to the server so logs appear in the server terminal
const postServerLog = async (msg: string) => {
  try {
    const url = SOCKET_URL.replace(/\/$/, '') + '/api/client-log';
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msg }) });
  } catch (e) {
    // ignore
  }
};

socket.on('connect', () => {
  logToOverlay('socket connected: ' + socket.id);
  postServerLog('connected: ' + socket.id);
});

socket.on('connect_error', (err) => {
  const text = 'connect_error: ' + (err?.message || String(err));
  logToOverlay(text);
  postServerLog(text);
});

socket.on('reconnect_attempt', (n) => {
  const text = 'reconnect attempt: ' + n;
  logToOverlay(text);
  postServerLog(text);
});

socket.on('reconnect_failed', () => {
  const text = 'reconnect failed';
  logToOverlay(text);
  postServerLog(text);
});

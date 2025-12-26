import axios from 'axios';

// Default fallback configuration
const defaultIceConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Fetch ICE servers from our backend (which might include TURN credentials)
export const getIceServers = async (): Promise<RTCConfiguration> => {
  try {
    // In dev, this proxies to localhost:3001/api/ice
    const response = await axios.get('/api/ice');
    if (response.data && response.data.iceServers) {
      return { iceServers: response.data.iceServers };
    }
    return defaultIceConfig;
  } catch (error) {
    console.warn("Failed to fetch ICE servers from backend, using default STUN.", error);
    return defaultIceConfig;
  }
};

export type InputType = 'gamepad' | 'keyboard' | 'mouse';

export type GamepadInput = {
  type: 'gamepad';
  inputType: 'button' | 'axis';
  code?: string;
  index?: number;
  value: number;
};

export type KeyboardInput = {
  type: 'keyboard';
  key: string;
  state: 'down' | 'up';
};

export type MouseInput = {
  type: 'mouse';
  dx: number;
  dy: number;
  buttons: number;
};

export type ControlInput = GamepadInput | KeyboardInput | MouseInput;

import { io } from 'socket.io-client';

// For local development, backend runs on 5000
const SOCKET_URL = 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: true, 
  transports: ['websocket'] // Force websocket for reliability
});

import { io } from 'socket.io-client';

// For local development, assuming backend runs on 3001
const SOCKET_URL = 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false, // We'll connect manually when the user joins
});

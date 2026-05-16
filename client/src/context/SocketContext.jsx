import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    const socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const joinEvent = (eventId) => socketRef.current?.emit('join-event', eventId);
  const leaveEvent = (eventId) => socketRef.current?.emit('leave-event', eventId);

  const onStockUpdate = (callback) => {
    socketRef.current?.on('stock-update', callback);
    return () => socketRef.current?.off('stock-update', callback);
  };

  const onEventStatusChange = (callback) => {
    socketRef.current?.on('event-status-change', callback);
    return () => socketRef.current?.off('event-status-change', callback);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, joinEvent, leaveEvent, onStockUpdate, onEventStatusChange }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
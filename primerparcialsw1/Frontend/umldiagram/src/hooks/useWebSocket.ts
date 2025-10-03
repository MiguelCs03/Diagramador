import { useState, useEffect, useRef, useCallback } from 'react';
import { UMLDiagram } from '../types/uml';

interface WebSocketMessage {
  type: string;
  payload?: any;
}

interface RoomState {
  isConnected: boolean;
  roomCode: string | null;
  clientCount: number;
  error: string | null;
}

interface UseWebSocketReturn {
  // Estado de conexión
  roomState: RoomState;
  
  // Acciones de sala
  createRoom: (diagram?: UMLDiagram) => void;
  joinRoom: (roomCode: string) => void;
  leaveRoom: () => void;
  
  // Actualización de diagrama
  sendDiagramUpdate: (diagram: UMLDiagram) => void;
  
  // Callbacks para eventos
  onDiagramUpdate: (callback: (diagram: UMLDiagram) => void) => void;
  onClientJoined: (callback: (clientCount: number) => void) => void;
  onClientLeft: (callback: (clientCount: number) => void) => void;
}

// Detectar automáticamente la URL correcta (KISS) o usar env
const WS_URL = 'wss://diagramadoruml.onrender.com/ws';

console.log('🔍 [WebSocket Debug] URL a usar:', WS_URL);
console.log('🔍 [WebSocket Debug] URL a usar:', WS_URL);
console.log('🔍 [WebSocket Debug] Location:', typeof window !== 'undefined' ? window.location.href : 'SSR');

export const useWebSocket = (): UseWebSocketReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const [roomState, setRoomState] = useState<RoomState>({
    isConnected: false,
    roomCode: null,
    clientCount: 0,
    error: null
  });

  console.log('🔍 [WebSocket Debug] Hook inicializado, estado:', roomState);

  // Callbacks refs (KISS - solo los necesarios)
  const onDiagramUpdateRef = useRef<((diagram: UMLDiagram) => void) | null>(null);
  const onClientJoinedRef = useRef<((clientCount: number) => void) | null>(null);
  const onClientLeftRef = useRef<((clientCount: number) => void) | null>(null);

  // Conectar WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Ya conectado
    }

    try {
      console.log('🔍 [WebSocket Debug] Intentando conectar a', WS_URL);
      console.log('🔍 [WebSocket Debug] Estado actual del WS:', wsRef.current?.readyState);
      
      wsRef.current = new WebSocket(WS_URL);
      console.log('🔍 [WebSocket Debug] WebSocket creado, estado:', wsRef.current.readyState);

      wsRef.current.onopen = () => {
        console.log('✅ [WebSocket] CONECTADO exitosamente a', WS_URL);
        setRoomState(prev => ({ ...prev, isConnected: true, error: null }));
      };

      wsRef.current.onmessage = (event) => {
        console.log('📨 [WebSocket] Mensaje recibido:', event.data);
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 [WebSocket] DESCONECTADO - Código:', event.code, 'Razón:', event.reason, 'Clean:', event.wasClean);
        setRoomState(prev => ({ 
          ...prev, 
          isConnected: false, 
          roomCode: null, 
          clientCount: 0, 
          error: `WebSocket cerrado. Código: ${event.code}, Razón: ${event.reason || 'Sin razón'}`
        }));
      };

      wsRef.current.onerror = (error) => {
        let errorMsg = '';
        if (error && error.type) {
          errorMsg += `Tipo: ${error.type}. `;
        }
        
        errorMsg += `URL: ${WS_URL}. Estado: ${wsRef.current?.readyState}`;
        console.error('❌ [WebSocket] ERROR DETALLADO:', error);
        console.error('❌ [WebSocket] URL que falló:', WS_URL);
        console.error('❌ [WebSocket] Estado actual:', wsRef.current?.readyState);
        setRoomState(prev => ({ 
          ...prev, 
          error: `Error de conexión WebSocket. ${errorMsg}` 
        }));
      };

      // Si no conecta en 3 segundos, mostrar error detallado
      setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.error('⏰ [WebSocket] TIMEOUT - No se conectó en 3 segundos');
          console.error('⏰ [WebSocket] Estado final:', wsRef.current?.readyState);
          console.error('⏰ [WebSocket] Estados: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED');
          setRoomState(prev => ({
            ...prev,
            error: `Timeout: No se pudo conectar a ${WS_URL} en 3 segundos. Estado: ${wsRef.current?.readyState || 'undefined'}`
          }));
        }
      }, 3000);

    } catch (error) {
      console.error('❌ [WebSocket] EXCEPCIÓN al crear WebSocket:', error);
      setRoomState(prev => ({ 
        ...prev, 
        error: `Excepción al crear WebSocket: ${error instanceof Error ? error.message : String(error)}` 
      }));
    }
  }, []);

  // Manejar mensajes del servidor
  const handleMessage = useCallback((message: WebSocketMessage) => {
    const { type, payload } = message;

    switch (type) {
      case 'ROOM_CREATED':
        setRoomState(prev => ({
          ...prev,
          roomCode: payload.roomCode,
          clientCount: payload.clientCount,
          error: null
        }));
        // Auto-aplicar diagrama inicial si existe callback
        if (payload.diagram && onDiagramUpdateRef.current) {
          onDiagramUpdateRef.current(payload.diagram);
        }
        break;

      case 'ROOM_JOINED':
        setRoomState(prev => ({
          ...prev,
          roomCode: payload.roomCode,
          clientCount: payload.clientCount,
          error: null
        }));
        // Aplicar diagrama actual de la sala
        if (payload.diagram && onDiagramUpdateRef.current) {
          onDiagramUpdateRef.current(payload.diagram);
        }
        break;

      case 'DIAGRAM_UPDATED':
        if (onDiagramUpdateRef.current) {
          onDiagramUpdateRef.current(payload.diagram);
        }
        break;

      case 'CLIENT_JOINED':
        setRoomState(prev => ({ ...prev, clientCount: payload.clientCount }));
        if (onClientJoinedRef.current) {
          onClientJoinedRef.current(payload.clientCount);
        }
        break;

      case 'CLIENT_LEFT':
        setRoomState(prev => ({ ...prev, clientCount: payload.clientCount }));
        if (onClientLeftRef.current) {
          onClientLeftRef.current(payload.clientCount);
        }
        break;

      case 'ERROR':
        setRoomState(prev => ({ ...prev, error: payload.message }));
        break;

      case 'PONG':
        // Heartbeat response - no action needed
        break;

      default:
        console.warn('⚠️ Unknown WebSocket message type:', type);
    }
  }, []);

  // Enviar mensaje al servidor
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('❌ WebSocket not connected');
      setRoomState(prev => ({ 
        ...prev, 
        error: 'Not connected to server' 
      }));
    }
  }, []);

  // Acciones de sala
  const createRoom = useCallback((diagram?: UMLDiagram) => {
    connect();
    setTimeout(() => {
      sendMessage({
        type: 'CREATE_ROOM',
        payload: { diagram }
      });
    }, 100); // Pequeño delay para asegurar conexión
  }, [connect, sendMessage]);

  const joinRoom = useCallback((roomCode: string) => {
    if (!roomCode.trim()) {
      setRoomState(prev => ({ ...prev, error: 'Please enter a room code' }));
      return;
    }

    connect();
    setTimeout(() => {
      sendMessage({
        type: 'JOIN_ROOM',
        payload: { roomCode: roomCode.toUpperCase() }
      });
    }, 100);
  }, [connect, sendMessage]);

  const leaveRoom = useCallback(() => {
    if (roomState.roomCode) {
      sendMessage({
        type: 'LEAVE_ROOM',
        payload: { roomCode: roomState.roomCode }
      });
    }
    setRoomState(prev => ({ 
      ...prev, 
      roomCode: null, 
      clientCount: 0,
      error: null 
    }));
  }, [roomState.roomCode, sendMessage]);

  const sendDiagramUpdate = useCallback((diagram: UMLDiagram) => {
    if (!roomState.roomCode) {
      console.warn('⚠️ Not in a room, cannot send diagram update');
      return;
    }

    sendMessage({
      type: 'UPDATE_DIAGRAM',
      payload: {
        roomCode: roomState.roomCode,
        diagram
      }
    });
  }, [roomState.roomCode, sendMessage]);

  // Configurar callbacks
  const onDiagramUpdate = useCallback((callback: (diagram: UMLDiagram) => void) => {
    onDiagramUpdateRef.current = callback;
  }, []);

  const onClientJoined = useCallback((callback: (clientCount: number) => void) => {
    onClientJoinedRef.current = callback;
  }, []);

  const onClientLeft = useCallback((callback: (clientCount: number) => void) => {
    onClientLeftRef.current = callback;
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    // Auto-conectar al montar el componente (KISS)
    console.log('🔍 [WebSocket Debug] useEffect - Auto-conectando...');
    connect();
    
    return () => {
      console.log('🔍 [WebSocket Debug] Cleanup - Cerrando WebSocket');
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Heartbeat para mantener conexión (YAGNI - opcional pero útil)
  useEffect(() => {
    if (!roomState.isConnected) return;

    const interval = setInterval(() => {
      sendMessage({ type: 'PING' });
    }, 30000); // Ping cada 30 segundos

    return () => clearInterval(interval);
  }, [roomState.isConnected, sendMessage]);

  return {
    roomState,
    createRoom,
    joinRoom,
    leaveRoom,
    sendDiagramUpdate,
    onDiagramUpdate,
    onClientJoined,
    onClientLeft
  };
};

export default useWebSocket;
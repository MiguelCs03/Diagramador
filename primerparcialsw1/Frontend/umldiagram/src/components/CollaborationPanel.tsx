import React, { useState } from 'react';

// Consumimos acciones/estado desde el padre para evitar múltiples conexiones WebSocket por cliente
interface CollaborationPanelProps {
  className?: string;
  roomState: {
    isConnected: boolean;
    roomCode: string | null;
    clientCount: number;
    error: string | null;
  };
  createRoom: (diagram?: any) => void;
  joinRoom: (roomCode: string) => void;
  leaveRoom: () => void;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({ 
  className = '',
  roomState,
  createRoom,
  joinRoom,
  leaveRoom
}) => {

  const [roomCodeInput, setRoomCodeInput] = useState('');

  const handleCreateRoom = () => {
    createRoom();
  };

  const handleJoinRoom = () => {
    if (roomCodeInput.trim()) {
      joinRoom(roomCodeInput.trim());
      setRoomCodeInput('');
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
  };

  const copyRoomCode = async () => {
    if (roomState.roomCode) {
      try {
        await navigator.clipboard.writeText(roomState.roomCode);
        // Simple feedback (KISS)
        const button = document.querySelector('[data-copy-button]') as HTMLButtonElement;
        if (button) {
          const originalText = button.textContent;
          button.textContent = '✓ Copied!';
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to copy room code:', error);
      }
    }
  };

  return (
    <div className={`collaboration-panel ${className}`}>
      <div className="collaboration-header">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">🤝 Colaboración</h3>
        
        {/* Connection Status */}
        <div className="connection-status mb-3">
          <span className={`status-indicator font-semibold ${roomState.isConnected ? 'text-green-700' : 'text-red-700'}`}
            style={{ background: roomState.isConnected ? '#e6ffed' : '#ffe6e6', padding: '2px 8px', borderRadius: '6px', border: roomState.isConnected ? '1px solid #22c55e' : '1px solid #ef4444' }}>
            {roomState.isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {roomState.error && (
        <div className="error-message mb-3 p-2 bg-red-700 border border-red-800 rounded text-white text-sm font-semibold">
          ⚠️ {roomState.error}
        </div>
      )}

      {/* Not in room - Show create/join options */}
      {!roomState.roomCode ? (
        <div className="room-actions space-y-3">
          {/* Create Room */}
          <div>
            <button
              onClick={handleCreateRoom}
              disabled={!roomState.isConnected}
              className="w-full px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              🏠 Crear nueva sala
            </button>
          </div>

          {/* Join Room */}
          <div className="join-room-section">
            <div className="flex gap-2">
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="Código de sala (ej: ABC123)"
                maxLength={6}
                className="flex-1 px-3 py-2 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 text-gray-900 font-semibold"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomState.isConnected || !roomCodeInput.trim()}
                className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                Unirse
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* In room - Show room info and controls */
        <div className="room-info space-y-3">
          {/* Room Code Display */}
          <div className="room-code-section">
            <label className="block text-sm font-bold text-gray-900 mb-1">
              Código de sala:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomState.roomCode}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-200 border border-gray-700 rounded font-mono text-lg text-center text-gray-900 font-bold"
              />
              <button
                onClick={copyRoomCode}
                data-copy-button
                className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors text-sm font-semibold"
              >
                📋 Copiar
              </button>
            </div>
          </div>

          {/* Client Count */}
          <div className="client-count">
            <span className="text-sm text-gray-900 font-semibold">
              👥 {roomState.clientCount} {roomState.clientCount === 1 ? 'persona' : 'personas'} en la sala
            </span>
          </div>

          {/* Leave Room */}
          <div className="leave-room-section">
            <button
              onClick={handleLeaveRoom}
              className="w-full px-4 py-2 bg-red-700 text-white rounded hover:bg-red-900 transition-colors font-semibold"
            >
              🚪 Salir de la sala
            </button>
          </div>
        </div>
      )}

      {/* Simple Instructions */}
      <div className="instructions mt-4 p-3 bg-gray-100 rounded text-sm text-gray-900">
        <p className="font-bold mb-1">💡 ¿Cómo funciona?</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Crea una sala para obtener un código de 6 caracteres</li>
          <li>Comparte el código con tus colaboradores</li>
          <li>Los cambios en el diagrama se sincronizan en tiempo real</li>
          <li>Los comandos de voz funcionan para todos</li>
        </ul>
      </div>
    </div>
  );
};

export default CollaborationPanel;
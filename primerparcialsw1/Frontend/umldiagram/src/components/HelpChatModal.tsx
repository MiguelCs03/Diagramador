import React, { useState, useRef, useEffect } from 'react';
import { getHelpResponse } from '../services/helpContent';

interface HelpChatMessage {
  id: string;
  type: 'user' | 'help';
  content: string;
  timestamp: Date;
}

interface HelpChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpChatModal: React.FC<HelpChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<HelpChatMessage[]>([
    {
      id: '1',
      type: 'help',
      content: '👋 ¡Hola! Soy tu asistente de ayuda para el Editor de Diagramas UML.\n\n📘 **Puedo ayudarte con:**\n• Cómo crear y editar clases\n• Cómo trabajar con relaciones\n• Exportar diagramas\n• Colaboración en tiempo real\n• Comandos de voz\n\n💡 **Ejemplos de preguntas:**\n• "¿Cómo crear una clase?"\n• "¿Cómo editar atributos?"\n• "¿Qué es una relación muchos a muchos?"\n• Escribe "manual" para ver todos los temas',
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const addMessage = (type: 'user' | 'help', content: string) => {
    const newMessage: HelpChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addMessage('user', userMessage);

    // Buscar respuesta en el manual local
    const helpResponse = getHelpResponse(userMessage);
    
    if (helpResponse) {
      addMessage('help', helpResponse);
    } else {
      addMessage('help', '🤔 No encontré información específica sobre eso.\n\nPuedes intentar con:\n• "manual" - para ver todos los temas disponibles\n• "¿cómo crear una clase?"\n• "¿cómo agregar atributos?"\n• "¿cómo hacer relaciones?"\n\nO describe tu pregunta de otra manera.');
    }
  };

  const quickQuestions = [
    "¿Cómo crear una clase?",
    "¿Cómo editar el nombre?",
    "¿Cómo agregar atributos?",
    "¿Cómo crear relaciones?",
    "¿Qué es muchos a muchos?",
    "Manual completo"
  ];

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg shadow-2xl w-[500px] h-[600px] flex flex-col max-w-[90vw] max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📘</span>
            <h3 className="font-semibold">Manual de Usuario</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-900 border border-blue-200'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        {messages.length <= 1 && (
          <div className="px-4 py-2 border-t border-gray-200">
            <div className="text-xs text-gray-600 mb-2">Preguntas frecuentes:</div>
            <div className="grid grid-cols-2 gap-1">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(question)}
                  className="text-left text-xs p-2 bg-gray-50 hover:bg-blue-50 rounded text-gray-700 hover:text-blue-700 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe tu pregunta sobre cómo usar la aplicación..."
              className="flex-1 text-sm p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HelpChatModal;
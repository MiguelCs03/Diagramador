import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AIService, type DiagramGenerationRequest, type DiagramGenerationResponse, type DiagramModificationRequest, type DiagramModificationResponse } from '../services/aiService';
import { getHelpResponse } from '../services/helpContent';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import type { UMLDiagram } from '../types/uml';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
}

interface AIChatBotProps {
  onDiagramGenerated: (diagram: UMLDiagram) => void;
  currentDiagram?: UMLDiagram;
  className?: string;
  isEmbedded?: boolean; // Si está embebido en panel lateral, siempre expandido
}

const AIChatBot: React.FC<AIChatBotProps> = ({ onDiagramGenerated, currentDiagram, className = '', isEmbedded = false }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-message',
      type: 'system',
      content: '¡Hola! 👋 Soy tu asistente de IA para diagramas UML.\n\n📋 **Puedo ayudarte con:**\n• Crear diagramas completos (ej: "Sistema de ventas")\n• Modificar diagramas existentes (ej: "Agrega la clase Producto")\n• Sugerir mejoras\n• Responder preguntas sobre cómo usar la aplicación\n\n💡 **Tips:**\n• Escribe "manual" o "guía" para ver el manual de usuario\n• Si no indicas el número de clases, yo elegiré una cantidad adecuada automáticamente.\n• Usa el micrófono 🎤 para hablar en lugar de escribir',
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(isEmbedded); // Si está embebido, siempre expandido
  const [isClient, setIsClient] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Verificar que estemos en el cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Voice recognition setup
  const handleVoiceResult = useCallback((transcript: string) => {
    setInputValue(transcript);
  }, []);

  const {
    isListening,
    isSupported,
    startListening,
    stopListening,
    transcript,
    error: voiceError
  } = useVoiceRecognition({
    onResult: handleVoiceResult,
    onError: (error) => {
      console.error('Voice error:', error);
      addMessage('ai', `⚠️ Error de voz: ${error}`);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = useCallback((type: 'user' | 'ai' | 'system', content: string) => {
    const newMessage: ChatMessage = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  // Handle voice commands similar to VoiceChat
  const handleVoiceCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;

    addMessage('user', `🎤 ${command}`);
    setIsLoading(true);

    try {
      // 1) Intentar responder con ayuda local (manual) antes de llamar a la IA
      const localHelp = getHelpResponse(command);
      if (localHelp) {
        addMessage('ai', localHelp);
        setIsLoading(false);
        return;
      }

      // Process voice command like text input
      const intent = AIService.detectUserIntent(command, !!currentDiagram);
      
      if (intent === 'modify' && currentDiagram) {
        const request: DiagramModificationRequest = {
          command: command,
          currentDiagram: currentDiagram
        };

        const response: DiagramModificationResponse = await AIService.modifyDiagram(request);

        if (response.success && response.updatedDiagram) {
          addMessage('ai', `✅ ${response.message}`);
          onDiagramGenerated(response.updatedDiagram);
        } else {
          addMessage('ai', `❌ Error: ${response.error || 'No se pudo modificar el diagrama. Intenta usar frases simples en español, por ejemplo: "Agrega la clase Producto con nombre y precio".'}`);
        }
      } else if (intent === 'create') {
        const request: DiagramGenerationRequest = {
          description: command,
          businessContext: currentDiagram ? `Reemplazando diagrama actual: ${currentDiagram.name}` : undefined
        };

        const response: DiagramGenerationResponse = await AIService.generateDiagram(request);

        if (response.success && response.diagram) {
          addMessage('ai', response.explanation || '✅ ¡Diagrama generado exitosamente!');
          onDiagramGenerated(response.diagram);
        } else {
          addMessage('ai', `❌ Error: ${response.error || 'No se pudo generar el diagrama. Escribe por ejemplo: "Sistema de ventas con 5 clases" o "Crea un diagrama de inventario".'}`);
        }
      } else {
        const response = await AIService.sendMessage(command, currentDiagram);
        
        if (response.success && response.response) {
          addMessage('ai', response.response);
        } else {
          addMessage('ai', `❌ Error: ${response.error || 'No se pudo procesar el mensaje. Intenta usar frases simples en español.'}`);
        }
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      addMessage('ai', '❌ Error al procesar el comando de voz. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, onDiagramGenerated, currentDiagram]);

  // Handle voice button click
  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      if (transcript) {
        handleVoiceCommand(transcript);
      }
    } else {
      startListening();
    }
  }, [isListening, stopListening, startListening, transcript, handleVoiceCommand]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      // 1) Intentar responder con ayuda local (manual) antes de llamar a la IA
      const localHelp = getHelpResponse(userMessage);
      if (localHelp) {
        addMessage('ai', localHelp);
        setIsLoading(false);
        return;
      }

      // Detectar la intención del usuario (KISS principle)
      const intent = AIService.detectUserIntent(userMessage, !!currentDiagram);
      
      if (intent === 'modify' && currentDiagram) {
        // Modificar diagrama existente
        const request: DiagramModificationRequest = {
          command: userMessage,
          currentDiagram: currentDiagram
        };

        const response: DiagramModificationResponse = await AIService.modifyDiagram(request);

        if (response.success && response.updatedDiagram) {
          addMessage('ai', `✅ ${response.message}`);
          onDiagramGenerated(response.updatedDiagram);
        } else {
          addMessage('ai', `❌ Error: ${response.error || 'No se pudo modificar el diagrama'}`);
        }
      } else if (intent === 'create') {
        // Crear nuevo diagrama
        const request: DiagramGenerationRequest = {
          description: userMessage,
          businessContext: currentDiagram ? `Reemplazando diagrama actual: ${currentDiagram.name}` : undefined
        };

        const response: DiagramGenerationResponse = await AIService.generateDiagram(request);

        if (response.success && response.diagram) {
          addMessage('ai', response.explanation || '✅ ¡Diagrama generado exitosamente!');
          onDiagramGenerated(response.diagram);
        } else {
          addMessage('ai', `❌ Error: ${response.error || 'No se pudo generar el diagrama'}`);
        }
      } else {
        // Chat conversacional
        const response = await AIService.sendMessage(userMessage, currentDiagram);
        
        if (response.success && response.response) {
          addMessage('ai', response.response);
        } else {
          addMessage('ai', `❌ Error: ${response.error || 'No se pudo procesar el mensaje'}`);
        }
      }
    } catch (error) {
  console.error('Error in chat:', error);
  addMessage('ai', '❌ Error al comunicarse con la IA. Por favor, inténtalo de nuevo usando frases simples en español.');
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, addMessage, onDiagramGenerated, currentDiagram]);

  const handleSuggestImprovements = useCallback(async () => {
    if (!currentDiagram || isLoading) return;

    setIsLoading(true);
    addMessage('user', '¿Puedes sugerir mejoras para el diagrama actual?');

    try {
      const suggestions = await AIService.suggestImprovements(currentDiagram);
      const suggestionsText = suggestions.length > 0 
        ? `💡 **Sugerencias de mejora:**\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
        : 'El diagrama actual parece estar bien diseñado. No tengo sugerencias específicas en este momento.';
      
      addMessage('ai', suggestionsText);
    } catch (error) {
      addMessage('ai', '❌ Error al obtener sugerencias.');
    } finally {
      setIsLoading(false);
    }
  }, [currentDiagram, isLoading, addMessage]);

  const examplePrompts = [
  "Sistema de ventas con 5 clases: Producto, Cliente, Factura, Vendedor, DetalleFactura",
  "Crea un diagrama de inventario con clases en español",
  "Sistema escolar con clases Alumno, Profesor, Curso, Nota, Materia",
  "Red social con Usuario, Publicación, Comentario, Mensaje, Grupo",
  "Sistema de biblioteca con Libro, Autor, Usuario"
  ];

  const modificationExamples = [
  "Agrega la clase Producto con atributos nombre, precio y stock",
  "Añade el atributo dirección a la clase Cliente",
  "Crea una relación entre Factura y Cliente",
  "Elimina la clase Temporal",
  "Modifica la clase Vendedor para incluir teléfono"
  ];

  const handleExampleClick = useCallback((example: string) => {
    setInputValue(example);
    inputRef.current?.focus();
  }, []);

  if (!isExpanded && !isEmbedded) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-110"
          title="Abrir Chat con IA"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.418 8-9.75 8a9.75 9.75 0 01-2.83-.403l-5.94 1.98c-.46.153-.977-.145-.832-.64l1.838-6.305A9.75 9.75 0 013 12c0-5.385 4.365-9.75 9.75-9.75S21 6.615 21 12z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`${isEmbedded ? 'h-full bg-white flex flex-col' : 'fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50'} ${className}`}>
      {/* Header */}
      <div className={`bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 ${!isEmbedded ? 'rounded-t-lg' : ''} flex justify-between items-center`}>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-400 animate-pulse' : 'bg-green-400 animate-pulse'}`}></div>
          <h3 className="font-semibold">
            {isListening ? 'Escuchando...' : 'Asistente IA UML'}
            {!isSupported && isClient && (
              <span className="text-xs ml-2 opacity-75">(Voz no disponible)</span>
            )}
          </h3>
        </div>
        {!isEmbedded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.type === 'system'
                  ? 'bg-gray-100 text-gray-700 border border-gray-200'
                  : 'bg-purple-100 text-purple-800 border border-purple-200'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-600">Generando diagrama...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {currentDiagram && (
        <div className="px-4 py-2 border-t border-gray-200">
          <button
            onClick={handleSuggestImprovements}
            disabled={isLoading}
            className="w-full text-sm py-2 px-3 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors disabled:opacity-50"
          >
            💡 Sugerir mejoras al diagrama actual
          </button>
        </div>
      )}

      {/* Example Prompts */}
      {messages.length <= 1 && (
        <div className="px-4 py-2 border-t border-gray-200">
          <div className="text-xs text-gray-600 mb-2">
            {currentDiagram ? "Ejemplos para modificar:" : "Ejemplos para crear:"}
          </div>
          <div className="space-y-1">
            {(currentDiagram ? modificationExamples : examplePrompts).slice(0, 3).map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="w-full text-left text-xs p-2 bg-gray-50 hover:bg-gray-100 rounded text-gray-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        {/* Intent indicator */}
        {(inputValue.trim() || (isListening && transcript)) && (
          <div className="mb-2 text-xs text-gray-600">
            {(() => {
              const text = isListening && transcript ? transcript : inputValue;
              const intent = AIService.detectUserIntent(text, !!currentDiagram);
              const icons = {
                create: '🔄 Crear nuevo diagrama',
                modify: '✏️ Modificar diagrama actual',
                chat: '💬 Conversar'
              };
              return icons[intent];
            })()}
            {isListening && (
              <span className="ml-2 text-blue-600 font-medium">🎤 Transcribiendo...</span>
            )}
          </div>
        )}
        
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={isListening ? transcript : inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isListening ? "Escuchando..." : (currentDiagram ? "Modifica el diagrama o crea uno nuevo..." : "Describe el negocio o sistema...")}
            className="flex-1 text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || isListening}
          />
          
          {/* Voice Recognition Button */}
          {isClient && isSupported && (
            <button
              type="button"
              onClick={handleVoiceToggle}
              disabled={isLoading}
              className={`p-2 rounded-md transition-colors ${
                isListening 
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isListening ? "Detener grabación" : "Hablar"}
            >
              {isListening ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          )}
          
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIChatBot;
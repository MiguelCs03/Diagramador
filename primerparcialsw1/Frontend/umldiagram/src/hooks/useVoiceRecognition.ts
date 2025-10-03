import { useState, useRef, useCallback, useEffect } from 'react';

// Definiciones de tipos para Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface UseVoiceRecognitionProps {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  transcript: string;
  error: string | null;
}

export const useVoiceRecognition = ({
  onResult,
  onError,
  language = 'es-ES'
}: UseVoiceRecognitionProps): UseVoiceRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Verificar soporte solo en el cliente (KISS - evitar problemas SSR)
  useEffect(() => {
    setIsSupported(
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    );
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      const errorMsg = 'Reconocimiento de voz no soportado en este navegador';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      // Verificar permisos de micrófono primero (KISS - prevenir errores comunes)
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (permission.state === 'denied') {
            const errorMsg = 'Permisos de micrófono denegados. Por favor, permite el acceso al micrófono en la configuración del navegador.';
            setError(errorMsg);
            onError?.(errorMsg);
            return;
          }
        } catch (permError) {
          // Continuar si no se pueden verificar permisos
          console.log('No se pudieron verificar permisos de micrófono:', permError);
        }
      }

      // Cleanup anterior
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        setTranscript('');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);

        if (finalTranscript) {
          onResult(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        let errorMsg = '';
        
        // Proporcionar mensajes más útiles según el tipo de error (KISS)
        switch (event.error) {
          case 'network':
            errorMsg = 'Error de conexión. Verifica tu conexión a internet o intenta en HTTPS.';
            break;
          case 'not-allowed':
            errorMsg = 'Permisos de micrófono denegados. Por favor, permite el acceso al micrófono.';
            break;
          case 'no-speech':
            errorMsg = 'No se detectó voz. Habla más cerca del micrófono.';
            break;
          case 'audio-capture':
            errorMsg = 'Error de captura de audio. Verifica que el micrófono esté conectado.';
            break;
          case 'service-not-allowed':
            errorMsg = 'Servicio de reconocimiento no disponible. Intenta usar HTTPS.';
            break;
          default:
            errorMsg = `Error de reconocimiento: ${event.error}`;
        }
        
        setError(errorMsg);
        setIsListening(false);
        onError?.(errorMsg);
        console.error('Voice recognition error:', event.error, event.message);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      const errorMsg = 'Error al iniciar reconocimiento de voz. Asegúrate de estar usando HTTPS.';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsListening(false);
      console.error('Voice recognition start error:', err);
    }
  }, [isSupported, language, onResult, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    transcript,
    error
  };
};

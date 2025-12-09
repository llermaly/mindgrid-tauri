import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSystemAudioOptions {
  onTranscript: (text: string) => void;
  onError?: (error: Error) => void;
}

interface UseSystemAudioReturn {
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  interimTranscript: string;
  error: string | null;
}

/**
 * Hook to capture system audio and convert it to text using Web Speech API
 *
 * This uses the Web Speech API for real-time, low-latency speech recognition.
 * For system audio capture, it requests desktop audio through getUserMedia.
 */
export function useSystemAudio({
  onTranscript,
  onError,
}: UseSystemAudioOptions): UseSystemAudioReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setInterimTranscript('');

      // Check if browser supports Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        throw new Error('Speech recognition is not supported in this browser');
      }

      // Request system audio capture
      // Note: This requires the Tauri window to have the proper permissions
      let stream: MediaStream;

      try {
        // Try to get system audio (desktop audio)
        // In Tauri/Electron, this requires additional configuration
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            // @ts-ignore - chromeMediaSource is a Chromium-specific property
            chromeMediaSource: 'desktop',
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          } as MediaTrackConstraints,
        });
      } catch (e) {
        // Fallback to regular microphone if system audio fails
        console.warn('System audio capture failed, falling back to microphone:', e);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      mediaStreamRef.current = stream;

      // Initialize speech recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setIsProcessing(false);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final) {
          onTranscript(final.trim());
          setInterimTranscript('');
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        const errorMessage = `Speech recognition error: ${event.error}`;
        setError(errorMessage);
        if (onError) {
          onError(new Error(errorMessage));
        }
        setIsRecording(false);
        setIsProcessing(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setIsProcessing(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      console.error('Failed to start recording:', err);
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
      setIsRecording(false);
      setIsProcessing(false);
    }
  }, [onTranscript, onError]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    setIsProcessing(false);
    setInterimTranscript('');
  }, []);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    interimTranscript,
    error,
  };
}

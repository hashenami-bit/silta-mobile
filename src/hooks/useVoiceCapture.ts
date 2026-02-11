import { useState } from 'react';
import type { VoiceFeatures, VoiceContext } from '../types';
import { extractVoiceFeatures, analyzeVoiceContext } from '../utils/audioUtils';
import { showToast } from '../utils/toast';

export const useVoiceCapture = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  const startRecording = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setIsRecording(true);
      setStatusMessage('Recording... Say "hello"');
    } catch {
      showToast('Unable to access microphone. Please check permissions.', 'error');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    setIsRecording(false);
    setStatusMessage('');
  };

  const captureAndAnalyzeVoice = async (
    onCaptured: (features: VoiceFeatures, context: VoiceContext) => void
  ): Promise<void> => {
    if (!audioStream) {
      showToast('Please start recording first', 'info');
      return;
    }

    setStatusMessage('Processing voice...');

    try {
      // Record audio
      const audioBuffer = await recordAudioFromStream(audioStream);

      // Transcribe speech
      let transcribedText: string;
      try {
        transcribedText = await transcribeSpeech();
      } catch (speechError) {
        const message = speechError instanceof Error ? speechError.message : 'Speech recognition failed';
        setStatusMessage(message);
        return;
      }

      // Check if "hello" was said
      if (!transcribedText.toLowerCase().includes('hello') &&
          !transcribedText.toLowerCase().includes('hi') &&
          !transcribedText.toLowerCase().includes('hey')) {
        setStatusMessage('Please say "hello", "hi", or "hey"');
        return;
      }

      // Extract voice features
      const voiceFeatures = await extractVoiceFeatures(audioBuffer);

      // Analyze voice context
      const voiceContext = analyzeVoiceContext(audioBuffer, transcribedText);

      setStatusMessage('Voice captured successfully!');
      onCaptured(voiceFeatures, voiceContext);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error capturing voice';
      setStatusMessage(message);
    }
  };

  const recordAudioFromStream = (stream: MediaStream): Promise<AudioBuffer> => {
    return new Promise((resolve, reject) => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];
      const startTime = Date.now();
      const maxDuration = 5000; // 5 seconds max
      let silenceStart = Date.now();
      const silenceThreshold = 0.01;
      const silenceDuration = 1000; // 1 second of silence to stop

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const currentTime = Date.now();
        
        // Calculate RMS energy
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        
        if (rms > silenceThreshold) {
          silenceStart = currentTime;
          chunks.push(new Float32Array(inputData));
        } else if (currentTime - silenceStart > silenceDuration && chunks.length > 0) {
          // Stop recording after silence
          source.disconnect();
          processor.disconnect();
          
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const combined = new Float32Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          
          const audioBuffer = audioContext.createBuffer(1, combined.length, audioContext.sampleRate);
          audioBuffer.getChannelData(0).set(combined);
          resolve(audioBuffer);
          return;
        } else {
          chunks.push(new Float32Array(inputData));
        }
        
        // Stop after max duration
        if (currentTime - startTime > maxDuration) {
          source.disconnect();
          processor.disconnect();
          
          if (chunks.length > 0) {
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const combined = new Float32Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
              combined.set(chunk, offset);
              offset += chunk.length;
            }
            
            const audioBuffer = audioContext.createBuffer(1, combined.length, audioContext.sampleRate);
            audioBuffer.getChannelData(0).set(combined);
            resolve(audioBuffer);
          } else {
            reject(new Error('No audio recorded'));
          }
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    });
  };

  const transcribeSpeech = async (): Promise<string> => {
    // Use Web Speech API for transcription
    return new Promise((resolve, reject) => {
      if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        reject(new Error('Speech recognition is not supported in this browser. Please use Chrome or Edge.'));
        return;
      }

      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition!;
      const recognition = new SpeechRecognitionCtor();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      let resolved = false;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (!resolved) {
          resolved = true;
          resolve(event.results[0][0].transcript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Speech recognition error: ${event.error}`));
        }
      };

      recognition.onend = () => {
        if (!resolved) {
          resolved = true;
          reject(new Error('No speech detected. Please try speaking louder or closer to the microphone.'));
        }
      };

      recognition.start();

      // Timeout
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          recognition.stop();
          reject(new Error('Speech recognition timed out. Please try again.'));
        }
      }, 5000);
    });
  };

  return {
    isRecording,
    statusMessage,
    startRecording,
    stopRecording,
    captureAndAnalyzeVoice,
  };
};


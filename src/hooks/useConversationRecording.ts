import { useState, useRef } from 'react';
import type { Profile, Conversation, ConversationSegment } from '../types';
import { extractVoiceFeatures, compareVoiceFeatures } from '../utils/audioUtils';
import { showToast } from '../utils/toast';

export const useConversationRecording = (profiles: Profile[]) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [activeSpeakers, setActiveSpeakers] = useState<Map<number, number>>(new Map());
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const segmentsRef = useRef<ConversationSegment[]>([]);
  const startTimeRef = useRef<number>(0);
  const lastSpeakerRef = useRef<number | null>(null);
  const currentSegmentRef = useRef<string>('');
  const streamRef = useRef<MediaStream | null>(null);

  const identifySpeaker = async (audioBuffer: AudioBuffer): Promise<{ profileId: number | null; confidence: number }> => {
    try {
      const voiceFeatures = await extractVoiceFeatures(audioBuffer);
      let bestMatch: Profile | null = null;
      let bestSimilarity = 0;
      const threshold = 0.4;

      for (const profile of profiles) {
        if (profile.voiceFeatures) {
          const similarity = compareVoiceFeatures(voiceFeatures, profile.voiceFeatures);
          if (similarity > bestSimilarity && similarity >= threshold) {
            bestSimilarity = similarity;
            bestMatch = profile;
          }
        }
      }

      return {
        profileId: bestMatch?.id || null,
        confidence: bestSimilarity
      };
    } catch {
      return { profileId: null, confidence: 0 };
    }
  };

  const generateSummary = (segments: ConversationSegment[]): string => {
    if (segments.length === 0) return 'No conversation recorded.';

    const speakers = new Set(segments.map(s => s.speakerName).filter(Boolean));
    const allText = segments.map(s => s.text).join(' ');
    const words = allText.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['the', 'and', 'that', 'this', 'with', 'from', 'have', 'were', 'been'].includes(word));

    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
    const topics = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)
      .join(', ');

    const speakerNames = Array.from(speakers);
    const speakerText = speakerNames.length > 0
      ? `Conversation with ${speakerNames.join(' and ')}. `
      : 'Conversation recorded. ';

    const summary = speakerText +
      (topics ? `Main topics: ${topics}. ` : '') +
      `Total segments: ${segments.length}.`;

    return summary;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      audioStreamRef.current = stream;
      streamRef.current = stream;
      setIsRecording(true);
      segmentsRef.current = [];
      currentSegmentRef.current = '';
      const getTimestamp = () => Date.now();
      startTimeRef.current = getTimestamp();
      lastSpeakerRef.current = null;

      if (window.SpeechRecognition || window.webkitSpeechRecognition) {
        const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition!;
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        currentSegmentRef.current = '';
        const getTimestamp = () => Date.now();
        let segmentStartTime = getTimestamp();

        recognition.onresult = async (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            }
          }

          if (finalTranscript.trim()) {
            currentSegmentRef.current += finalTranscript;

            const getTimestamp = () => Date.now();
            const now = getTimestamp();
            const timeSinceLastSegment = (now - segmentStartTime) / 1000;

            if (timeSinceLastSegment > 1.0 || currentSegmentRef.current.length > 30) {
              const segmentText = currentSegmentRef.current.trim();

              if (segmentText.length > 0) {
                try {
                  const audioBuffer = await captureAudioSegment(stream, 2000);
                  const { profileId, confidence } = await identifySpeaker(audioBuffer);

                  const profile = profileId ? profiles.find(p => p.id === profileId) : null;

                  const segment: ConversationSegment = {
                    speakerId: profileId,
                    speakerName: profile?.name || null,
                    text: segmentText,
                    timestamp: (getTimestamp() - startTimeRef.current) / 1000,
                    confidence
                  };

                  segmentsRef.current.push(segment);

                  if (profileId) {
                    setActiveSpeakers(prev => {
                      const newMap = new Map(prev);
                      newMap.set(profileId, (newMap.get(profileId) || 0) + 1);
                      return newMap;
                    });
                  } else {
                    setActiveSpeakers(prev => {
                      const newMap = new Map(prev);
                      newMap.set(-1, (newMap.get(-1) || 0) + 1);
                      return newMap;
                    });
                  }

                  currentSegmentRef.current = '';
                  segmentStartTime = getTimestamp();
                  lastSpeakerRef.current = profileId;
                } catch {
                  // Save segment even if speaker identification fails
                  const segment: ConversationSegment = {
                    speakerId: null,
                    speakerName: null,
                    text: segmentText,
                    timestamp: (getTimestamp() - startTimeRef.current) / 1000,
                    confidence: 0
                  };
                  segmentsRef.current.push(segment);
                  currentSegmentRef.current = '';
                  segmentStartTime = getTimestamp();

                  setActiveSpeakers(prev => {
                    const newMap = new Map(prev);
                    newMap.set(-1, (newMap.get(-1) || 0) + 1);
                    return newMap;
                  });
                }
              }
            }
          }
        };

        recognition.onerror = () => {
          // Speech recognition error - will auto-restart via onend
        };

        recognition.onend = () => {
          if (isRecording) {
            recognition.start();
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      // Set up MediaRecorder for backup audio capture
      try {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        mediaRecorderRef.current = mediaRecorder;
      } catch {
        // MediaRecorder not supported
      }
    } catch {
      showToast('Unable to start conversation recording. Please check microphone permissions.', 'error');
    }
  };

  const captureAudioSegment = async (stream: MediaStream, duration: number): Promise<AudioBuffer> => {
    return new Promise((resolve, reject) => {
      try {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        const chunks: Float32Array[] = [];
        let isRecording = true;

        processor.onaudioprocess = (e) => {
          if (!isRecording) return;
          const inputData = e.inputBuffer.getChannelData(0);
          chunks.push(new Float32Array(inputData));
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        setTimeout(() => {
          isRecording = false;
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
            audioContext.close();
            resolve(audioBuffer);
          } else {
            audioContext.close();
            reject(new Error('No audio captured'));
          }
        }, duration);
      } catch (error) {
        reject(error);
      }
    });
  };

  const stopRecording = async (): Promise<Conversation | null> => {
    setIsRecording(false);

    // Wait a bit to process any final segments
    await new Promise(resolve => setTimeout(resolve, 500));

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
      recognitionRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Already stopped
      }
    }

    // Process final segment if any remaining text
    const segments = [...segmentsRef.current];

    if (currentSegmentRef.current.trim().length > 0) {
      const finalText = currentSegmentRef.current.trim();
      if (finalText.length > 0) {
        try {
          if (streamRef.current) {
            const audioBuffer = await captureAudioSegment(streamRef.current, 1000);
            const { profileId, confidence } = await identifySpeaker(audioBuffer);
            const profile = profileId ? profiles.find(p => p.id === profileId) : null;

            const finalSegment: ConversationSegment = {
              speakerId: profileId,
              speakerName: profile?.name || null,
              text: finalText,
              timestamp: (Date.now() - startTimeRef.current) / 1000,
              confidence
            };

            segments.push(finalSegment);
          } else {
            const finalSegment: ConversationSegment = {
              speakerId: null,
              speakerName: null,
              text: finalText,
              timestamp: (Date.now() - startTimeRef.current) / 1000,
              confidence: 0
            };
            segments.push(finalSegment);
          }
        } catch {
          const finalSegment: ConversationSegment = {
            speakerId: null,
            speakerName: null,
            text: finalText,
            timestamp: (Date.now() - startTimeRef.current) / 1000,
            confidence: 0
          };
          segments.push(finalSegment);
        }
        currentSegmentRef.current = '';
      }
    }

    if (segments.length === 0) {
      return null;
    }

    const summary = generateSummary(segments);
    const participants = Array.from(new Set(segments.map(s => s.speakerId).filter((id): id is number => id !== null)));

    const now = Date.now();
    const conversation: Conversation = {
      id: now,
      startTime: startTimeRef.current,
      endTime: now,
      segments,
      summary,
      participants
    };

    setCurrentConversation(conversation);
    return conversation;
  };

  return {
    isRecording,
    currentConversation,
    activeSpeakers,
    startRecording,
    stopRecording,
  };
};

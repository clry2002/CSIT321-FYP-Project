import { useState, useEffect, useRef } from 'react';

interface UseSpeechReturn {
  speakingItemId: string | null;
  isPaused: boolean;
  startSpeech: (text: string, itemId: string) => void;
  toggleSpeech: (title: string, description: string, itemId: string) => void;
  stopAllSpeech: () => void;
}

export const useSpeech = (): UseSpeechReturn => {
  const [speakingItemId, setSpeakingItemId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Set up speech synthesis state checker
  useEffect(() => {
    if (speakingItemId) {
      // Check paused state every 100ms
      const checkInterval = setInterval(() => {
        if (window.speechSynthesis) {
          setIsPaused(window.speechSynthesis.paused);
        }
      }, 100);
      
      return () => clearInterval(checkInterval);
    }
  }, [speakingItemId]);

  const startSpeech = (text: string, itemId: string) => {
    if (!('speechSynthesis' in window)) return;

    // Create a new speech utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    // Save the current utterance to the ref
    utteranceRef.current = utterance;
    
    // Add event listener for when speech ends
    utterance.onend = () => {
      setSpeakingItemId(null);
      setIsPaused(false);
    };
    
    // Set the speaking item ID
    setSpeakingItemId(itemId);
    setIsPaused(false);
    
    // Start speaking
    speechSynthesis.speak(utterance);
  };

  const toggleSpeech = (title: string, description: string, itemId: string) => {
    if (!('speechSynthesis' in window)) return;

    // If text is currently speaking, toggle pause/resume
    if (speakingItemId === itemId) {
      if (speechSynthesis.speaking) {
        if (speechSynthesis.paused) {
          speechSynthesis.resume();
          setIsPaused(false);
        } else {
          speechSynthesis.pause();
          setIsPaused(true);
        }
      } else {
        // If finished speaking, start again
        speechSynthesis.cancel();
        startSpeech(`${title}. ${description}`, itemId);
      }
    } else {
      // If speaking a different item, cancel and start new speech
      speechSynthesis.cancel();
      startSpeech(`${title}. ${description}`, itemId);
    }
  };

  const stopAllSpeech = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setSpeakingItemId(null);
      setIsPaused(false);
    }
  };

  return {
    speakingItemId,
    isPaused,
    startSpeech,
    toggleSpeech,
    stopAllSpeech
  };
};
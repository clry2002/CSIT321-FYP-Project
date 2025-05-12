import { useState, useRef } from 'react';

export const useChatModals = () => {
  // Chat visibility state
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Calendar modal state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Image enlargement modal
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  
  // Video iframe references
  const iframeRefs = useRef<{ [key: number]: HTMLIFrameElement | null }>({});
  
  const addIframeRef = (index: number, ref: HTMLIFrameElement | null) => {
    iframeRefs.current[index] = ref;
  };
  
  const stopVideoPlayers = () => {
    Object.values(iframeRefs.current).forEach(iframe => {
      if (iframe && iframe.src) {
        const currentSrc = iframe.src;
        iframe.src = '';
        iframe.src = currentSrc;
      }
    });
  };
  
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };
  
  const closeChat = (stopSpeech: () => void) => {
    stopVideoPlayers();
    stopSpeech();
    setIsChatOpen(false);
  };

  const toggleCalendar = () => {
    if (!isCalendarOpen) {
      setIsCalendarOpen(true);
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 300); // Match transition duration
    } else {
      setIsTransitioning(true);
      setTimeout(() => {
        setIsCalendarOpen(false);
        setIsTransitioning(false);
      }, 300); // Match transition duration
    }
  };
  
  const showEnlargedImage = (imageUrl: string) => {
    setEnlargedImage(imageUrl);
  };

  const closeEnlargedImage = () => {
    setEnlargedImage(null);
  };
  
  return {
    // States
    isChatOpen,
    isCalendarOpen,
    isTransitioning,
    enlargedImage,
    iframeRefs,
    
    // Methods
    toggleChat,
    closeChat,
    toggleCalendar,
    showEnlargedImage,
    closeEnlargedImage,
    addIframeRef,
    stopVideoPlayers
  };
};

export default useChatModals;
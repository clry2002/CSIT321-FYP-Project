import { useState, useRef } from 'react';

/**
 * Custom hook to manage all modal states and transitions for the chat interface
 * @returns State and handlers for chat modals
 */
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
  
  /**
   * Add an iframe reference to the collection
   * @param index The index of the iframe
   * @param ref The iframe element reference
   */
  const addIframeRef = (index: number, ref: HTMLIFrameElement | null) => {
    iframeRefs.current[index] = ref;
  };
  
  /**
   * Stop all video players to prevent background audio
   */
  const stopVideoPlayers = () => {
    Object.values(iframeRefs.current).forEach(iframe => {
      if (iframe && iframe.src) {
        const currentSrc = iframe.src;
        iframe.src = '';
        iframe.src = currentSrc;
      }
    });
  };
  
  /**
   * Handle toggling the chat visibility
   */
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };
  
  /**
   * Close the chat and clean up resources
   */
  const closeChat = (stopSpeech: () => void) => {
    stopVideoPlayers();
    stopSpeech();
    setIsChatOpen(false);
  };
  
  /**
   * Handle toggling the calendar with animation
   */
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
  
  /**
   * Show enlarged image in modal
   * @param imageUrl URL of the image to enlarge
   */
  const showEnlargedImage = (imageUrl: string) => {
    setEnlargedImage(imageUrl);
  };
  
  /**
   * Close the enlarged image modal
   */
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
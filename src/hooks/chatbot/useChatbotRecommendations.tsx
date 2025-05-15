// // useRecommendations.tsx - Custom hook for handling recommendations
// import { useState, useCallback } from 'react';
// import { useChatbot } from '@/hooks/useChatbot';

// interface UseRecommendationsProps {
//   onUpdate?: () => void;
// }

// export function useRecommendations({ onUpdate }: UseRecommendationsProps = {}) {
//   const { sendMessage } = useChatbot();
//   const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

//   /**
//    * Request trending content from the backend
//    * @param contentType Optional filter for content type (books, videos, or both if not specified)
//    */
//   const requestTrending = useCallback(async (contentType?: 'books' | 'videos') => {
//     try {
//       setIsLoadingRecommendations(true);
      
//       // Build the query based on content type
//       let query = "What's trending now?";
//       if (contentType === 'books') {
//         query = "What are the trending books?";
//       } else if (contentType === 'videos') {
//         query = "What are the trending videos?";
//       }
      
//       // Send the message to get trending content
//       await sendMessage(query);
      
//       if (onUpdate) {
//         onUpdate();
//       }
//     } catch (error) {
//       console.error('Error requesting trending content:', error);
//     } finally {
//       setIsLoadingRecommendations(false);
//     }
//   }, [sendMessage, onUpdate]);

//   /**
//    * Request popular content from the backend
//    * @param contentType Optional filter for content type (books, videos, or both if not specified)
//    */
//   const requestPopular = useCallback(async (contentType?: 'books' | 'videos') => {
//     try {
//       setIsLoadingRecommendations(true);
      
//       // Build the query based on content type
//       let query = "Show me popular content";
//       if (contentType === 'books') {
//         query = "Show me popular books";
//       } else if (contentType === 'videos') {
//         query = "Show me popular videos";
//       }
      
//       // Send the message to get popular content
//       await sendMessage(query);
      
//       if (onUpdate) {
//         onUpdate();
//       }
//     } catch (error) {
//       console.error('Error requesting popular content:', error);
//     } finally {
//       setIsLoadingRecommendations(false);
//     }
//   }, [sendMessage, onUpdate]);

//   /**
//    * Request personalized recommendations from the backend
//    * @param contentType Optional filter for content type (books, videos, or both if not specified)
//    */
//   const requestRecommended = useCallback(async (contentType?: 'books' | 'videos') => {
//     try {
//       setIsLoadingRecommendations(true);
      
//       // Build the query based on content type
//       let query = "Recommend something for me";
//       if (contentType === 'books') {
//         query = "Recommend books for me";
//       } else if (contentType === 'videos') {
//         query = "Recommend videos for me";
//       }
      
//       // Send the message to get recommended content
//       await sendMessage(query);
      
//       if (onUpdate) {
//         onUpdate();
//       }
//     } catch (error) {
//       console.error('Error requesting recommended content:', error);
//     } finally {
//       setIsLoadingRecommendations(false);
//     }
//   }, [sendMessage, onUpdate]);

//   return {
//     requestTrending,
//     requestPopular,
//     requestRecommended,
//     isLoadingRecommendations
//   };
// }

// export default useRecommendations;
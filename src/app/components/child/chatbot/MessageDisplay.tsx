// // Updated MessageDisplay component to properly handle recommendations
// import React from 'react';
// import { Message, Content } from '@/hooks/useChatbot';
// import MessageRenderer from './MessageRenderer';
// import GenreSuggestions from './GenreSuggestions';
// import ContentItem from './ContentItem';
// import RecommendationDisplay from './RecommendationDisplay';

// interface MessageDisplayProps {
//   message: Message;
//   index: number;
//   isLastMessage: boolean;
//   speakingItemId: string;
//   isPaused: boolean;
//   toggleSpeech: (title: string, description: string, itemId: string) => void;
//   handleImageClick: (imageUrl: string) => void;
//   addIframeRef: (index: number, ref: HTMLIFrameElement | null) => void;
//   onGenreClick: (genre: string) => void;
//   showGenreSuggestions: boolean;
//   favoriteGenres: string[];
//   showRandomGenres: boolean;
//   randomGenres: string[];
//   onAddToSchedule?: (book: { cid: number; title: string }) => void;
// }

// const MessageDisplay: React.FC<MessageDisplayProps> = ({
//   message,
//   index,
//   isLastMessage,
//   speakingItemId,
//   isPaused,
//   toggleSpeech,
//   handleImageClick,
//   addIframeRef,
//   onGenreClick,
//   showGenreSuggestions,
//   favoriteGenres,
//   showRandomGenres,
//   randomGenres,
//   onAddToSchedule
// }) => {
//   // Handle different message content types
//   const renderMessageContent = () => {
//     // Case 1: Message has recommendation data structure
//     if (message.recommendation) {
//       console.log("Rendering recommendation:", message.recommendation);
//       return (
//         <RecommendationDisplay
//           books={message.recommendation.books}
//           videos={message.recommendation.videos}
//           message={message.recommendation.message}
//           recommendationType={message.recommendation.recommendation_type}
//           speakingItemId={speakingItemId}
//           isPaused={isPaused}
//           toggleSpeech={toggleSpeech}
//           handleImageClick={handleImageClick}
//           addIframeRef={addIframeRef}
//           onAddToSchedule={onAddToSchedule}
//         />
//       );
//     }
    
//     // Case 2: Message content is an array of Content objects
//     if (Array.isArray(message.content)) {
//       return (
//         <ul className="content-list">
//           {message.content.map((item: Content, idx: number) => {
//             const itemId = `item-${index}-${idx}`;
//             const contentIndex = index * 100 + idx;
            
//             return (
//               <ContentItem
//                 key={idx}
//                 item={item}
//                 itemId={itemId}
//                 speakingItemId={speakingItemId}
//                 isPaused={isPaused}
//                 toggleSpeech={toggleSpeech}
//                 handleImageClick={handleImageClick}
//                 index={contentIndex}
//                 addIframeRef={addIframeRef}
//                 onAddToSchedule={item.cid && item.title ? () => onAddToSchedule?.({ 
//                   cid: Number(item.cid), 
//                   title: item.title 
//                 }) : undefined}
//               />
//             );
//           })}
//         </ul>
//       );
//     }
    
//     // Case 3: Standard text message
//     return (
//       <div>
//         <MessageRenderer 
//           message={message.content as string} 
//           onGenreClick={message.role === 'assistant' ? onGenreClick : undefined} 
//         />
        
//         {/* Only show genre suggestions after the latest bot message */}
//         {message.role === 'assistant' && isLastMessage && (
//           <GenreSuggestions
//             showGenreSuggestions={showGenreSuggestions}
//             favoriteGenres={favoriteGenres}
//             showRandomGenres={showRandomGenres}
//             randomGenres={randomGenres}
//             messageContent={message.content as string}
//             handleGenreClick={onGenreClick}
//           />
//         )}
//       </div>
//     );
//   };

//   return (
//     <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
//       <div className={message.role === 'user' ? 'user-message' : 'bot-message'}>
//         {renderMessageContent()}
//       </div>
//     </div>
//   );
// };

// export default MessageDisplay;
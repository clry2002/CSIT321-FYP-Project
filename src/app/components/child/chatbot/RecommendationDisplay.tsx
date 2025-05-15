// // components/child/chatbot/RecommendationDisplay.tsx
// import React from 'react';
// import Image from 'next/image';
// import { Content } from '@/hooks/useChatbot';
// import AudioButton from './audioButton';
// import VideoRenderer from './VideoRenderer';
// import AgeBadge from './AgeBadge';

// interface RecommendationDisplayProps {
//   books?: Content[];
//   videos?: Content[];
//   message?: string;
//   recommendationType?: 'trending' | 'popular' | 'recommended';
//   speakingItemId: string;
//   isPaused: boolean;
//   toggleSpeech: (title: string, description: string, itemId: string) => void;
//   handleImageClick: (imageUrl: string) => void;
//   addIframeRef: (index: number, ref: HTMLIFrameElement | null) => void;
//   onAddToSchedule?: (book: { cid: number; title: string }) => void;
// }

// const RecommendationDisplay: React.FC<RecommendationDisplayProps> = ({
//   books = [],
//   videos = [],
//   message = 'Here are some recommendations for you!',
//   recommendationType = 'recommended',
//   speakingItemId,
//   isPaused,
//   toggleSpeech,
//   handleImageClick,
//   addIframeRef,
//   onAddToSchedule
// }) => {
//   // Determine which groups to show
//   const showBooks = books && books.length > 0;
//   const showVideos = videos && videos.length > 0;
//   const startIndex = 1000;

//   return (
//     <div className="recommendation-section">
//       <div className="recommendation-header">
//         <h3>{message}</h3>
//       </div>

//       {/* Books section */}
//       {showBooks && (
//         <div className="books-section">
//           <h4 className="section-title">Books</h4>
//           <ul className="recommendation-grid">
//             {books.map((book, index) => {
//               const itemId = `rec-book-${startIndex + index}`;
//               return (
//                 <li key={`book-${book.cid || index}`} className="book-item">
//                   <div className="content-header">
//                     <strong>{book.title}</strong>
//                     <AgeBadge minimumAge={book.minimumage} />
//                   </div>
                  
//                   <div className="content-description">
//                     {book.description}
//                   </div>
                  
//                   {book.coverimage && (
//                     <Image
//                       src={book.coverimage}
//                       alt={`Cover of ${book.title}`}
//                       width={100}
//                       height={150}
//                       className="book-cover-image"
//                       onClick={() => book.coverimage && handleImageClick(book.coverimage)}
//                       unoptimized
//                     />
//                   )}

//                   <AudioButton 
//                     title={book.title}
//                     description={book.description}
//                     itemId={itemId}
//                     isSpeaking={speakingItemId === itemId}
//                     isPaused={isPaused}
//                     onToggle={toggleSpeech}
//                   />
                  
//                   <div className="content-actions">
//                     <a
//                       href={book.contenturl}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className="chatbot-button-style view-book-link"
//                     >
//                       View Book
//                     </a>
                    
//                     {book.cid && book.cid !== 0 ? (
//                       <>
//                         <a
//                           href={`/bookdetail/${book.cid}`}
//                           className="chatbot-button-style view-details-link"
//                         >
//                           View Details
//                         </a>
//                         <button
//                           className="chatbot-button-style add-to-schedule-link"
//                           type="button"
//                           onClick={() => onAddToSchedule && onAddToSchedule({ 
//                             cid: Number(book.cid), 
//                             title: book.title 
//                           })}
//                         >
//                           Add to Reading Schedule
//                         </button>
//                       </>
//                     ) : (
//                       <span>Details unavailable</span>
//                     )}
//                   </div>
//                 </li>
//               );
//             })}
//           </ul>
          
//           <a 
//             href={`/${recommendationType}-books`}
//             className="see-more-link"
//           >
//             See more {recommendationType} books →
//           </a>
//         </div>
//       )}

//       {/* Videos section */}
//       {showVideos && (
//         <div className="videos-section">
//           <h4 className="section-title">Videos</h4>
//           <ul className="recommendation-grid">
//             {videos.map((video, index) => {
//               const itemId = `rec-video-${startIndex + index}`;
//               const fullIndex = startIndex + books.length + index;
              
//               return (
//                 <li key={`video-${video.cid || index}`} className="video-item">
//                   <div className="content-header">
//                     <strong>{video.title}</strong>
//                     <AgeBadge minimumAge={video.minimumage} />
//                   </div>
                  
//                   <div className="content-description">
//                     {video.description}
//                   </div>
                  
//                   <AudioButton 
//                     title={video.title}
//                     description={video.description}
//                     itemId={itemId}
//                     isSpeaking={speakingItemId === itemId}
//                     isPaused={isPaused}
//                     onToggle={toggleSpeech}
//                   />
                  
//                   <div className="content-actions">
//                     <VideoRenderer 
//                       contentUrl={video.contenturl} 
//                       index={fullIndex} 
//                       iframeRef={(ref) => addIframeRef(fullIndex, ref)} 
//                     />
                    
//                     {video.cid && (
//                       <a
//                         href={`/videodetail/${video.cid}`}
//                         className="chatbot-button-style view-details-link"
//                       >
//                         View Video Details
//                       </a>
//                     )}
//                   </div>
//                 </li>
//               );
//             })}
//           </ul>
          
//           <a 
//             href={`/${recommendationType}-videos`}
//             className="see-more-link"
//           >
//             See more {recommendationType} videos →
//           </a>
//         </div>
//       )}
//     </div>
//   );
// };

// export default RecommendationDisplay;
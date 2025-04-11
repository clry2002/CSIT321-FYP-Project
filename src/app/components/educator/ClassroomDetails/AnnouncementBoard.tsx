// // components/educator/AnnouncementBoardSection.tsx
// 'use client';

// import { useState, useEffect } from 'react';
// import { supabase } from '@/lib/supabase';
// import { Bell, Plus, Edit, Trash2 } from 'lucide-react';
// import { formatDistanceToNow } from 'date-fns';

// type Announcement = {
//   id: number;
//   title: string;
//   content: string;
//   created_at: string;
//   updated_at?: string;
//   created_by: string;
//   author_name?: string;
// };

// type AnnouncementBoardProps = {
//   classroomId: number;
//   educatorId: string | null;
// };

// export default function AnnouncementBoardSection({ classroomId, educatorId }: AnnouncementBoardProps) {
//   const [announcements, setAnnouncements] = useState<Announcement[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
  
//   // New announcement form states
//   const [showNewAnnouncementForm, setShowNewAnnouncementForm] = useState(false);
//   const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
//   const [newAnnouncementContent, setNewAnnouncementContent] = useState('');
  
//   // Edit announcement states
//   const [editingAnnouncementId, setEditingAnnouncementId] = useState<number | null>(null);
//   const [editTitle, setEditTitle] = useState('');
//   const [editContent, setEditContent] = useState('');

//   useEffect(() => {
//     fetchAnnouncements();
//   }, [classroomId]);

//   const fetchAnnouncements = async () => {
//     setLoading(true);
//     try {
//       // Get announcements for this classroom
//       const { data, error } = await supabase
//         .from('classroom_announcements')
//         .select(`
//           id, 
//           title, 
//           content, 
//           created_at,
//           updated_at,
//           created_by,
//           user_account(fullname)
//         `)
//         .eq('classroom_id', classroomId)
//         .order('created_at', { ascending: false });

//       if (error) throw error;

//       // Format the announcements data
//       const formattedAnnouncements = (data || []).map(announcement => ({
//         ...announcement,
//         author_name: announcement.user_account?.fullname || 'Unknown'
//       }));

//       setAnnouncements(formattedAnnouncements);
//     } catch (error) {
//       console.error('Error fetching announcements:', error);
//       setError('Failed to load announcements');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCreateAnnouncement = async () => {
//     if (!newAnnouncementTitle.trim() || !newAnnouncementContent.trim()) {
//       setError('Please provide both title and content');
//       return;
//     }

//     try {
//       const { data, error } = await supabase
//         .from('classroom_announcements')
//         .insert({
//           classroom_id: classroomId,
//           title: newAnnouncementTitle,
//           content: newAnnouncementContent,
//           created_by: educatorId
//         })
//         .select();

//       if (error) throw error;

//       // Reset form and refresh announcements
//       setNewAnnouncementTitle('');
//       setNewAnnouncementContent('');
//       setShowNewAnnouncementForm(false);
//       await fetchAnnouncements();
//     } catch (error) {
//       console.error('Error creating announcement:', error);
//       setError('Failed to create announcement');
//     }
//   };

//   const handleEditAnnouncement = async () => {
//     if (!editTitle.trim() || !editContent.trim()) {
//       setError('Please provide both title and content');
//       return;
//     }

//     try {
//       const { error } = await supabase
//         .from('classroom_announcements')
//         .update({
//           title: editTitle,
//           content: editContent,
//           updated_at: new Date().toISOString()
//         })
//         .eq('id', editingAnnouncementId);

//       if (error) throw error;

//       // Reset form and refresh announcements
//       setEditingAnnouncementId(null);
//       await fetchAnnouncements();
//     } catch (error) {
//       console.error('Error updating announcement:', error);
//       setError('Failed to update announcement');
//     }
//   };

//   const handleDeleteAnnouncement = async (announcementId: number) => {
//     if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
//       return;
//     }

//     try {
//       const { error } = await supabase
//         .from('classroom_announcements')
//         .delete()
//         .eq('id', announcementId);

//       if (error) throw error;

//       await fetchAnnouncements();
//     } catch (error) {
//       console.error('Error deleting announcement:', error);
//       setError('Failed to delete announcement');
//     }
//   };

//   const startEditing = (announcement: Announcement) => {
//     setEditingAnnouncementId(announcement.id);
//     setEditTitle(announcement.title);
//     setEditContent(announcement.content);
//   };

//   const formatDate = (dateString: string) => {
//     try {
//       return formatDistanceToNow(new Date(dateString), { addSuffix: true });
//     } catch (error) {
//       return 'Invalid date';
//     }
//   };

//   return (
//     <div className="mt-4">
//       <div className="flex justify-between items-center mb-4">
//         <h2 className="text-xl font-bold text-gray-800">
//           <Bell className="inline mr-2" size={20} />
//           Announcement Board
//         </h2>
//         <button 
//           onClick={() => setShowNewAnnouncementForm(!showNewAnnouncementForm)}
//           className="flex items-center bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
//         >
//           <Plus size={16} className="mr-1" />
//           {showNewAnnouncementForm ? 'Cancel' : 'New Announcement'}
//         </button>
//       </div>

//       {error && <p className="text-red-500 mb-4">{error}</p>}

//       {/* New Announcement Form */}
//       {showNewAnnouncementForm && (
//         <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
//           <h3 className="text-lg font-semibold mb-3">Create New Announcement</h3>
//           <div className="mb-3">
//             <label className="block text-gray-700 mb-1">Title</label>
//             <input
//               type="text"
//               value={newAnnouncementTitle}
//               onChange={(e) => setNewAnnouncementTitle(e.target.value)}
//               className="w-full p-2 border rounded"
//               placeholder="Announcement title"
//             />
//           </div>
//           <div className="mb-3">
//             <label className="block text-gray-700 mb-1">Content</label>
//             <textarea
//               value={newAnnouncementContent}
//               onChange={(e) => setNewAnnouncementContent(e.target.value)}
//               className="w-full p-2 border rounded"
//               rows={4}
//               placeholder="Announcement content"
//             />
//           </div>
//           <div className="flex justify-end">
//             <button
//               onClick={handleCreateAnnouncement}
//               className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
//             >
//               Create Announcement
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Edit Announcement Form */}
//       {editingAnnouncementId && (
//         <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
//           <h3 className="text-lg font-semibold mb-3">Edit Announcement</h3>
//           <div className="mb-3">
//             <label className="block text-gray-700 mb-1">Title</label>
//             <input
//               type="text"
//               value={editTitle}
//               onChange={(e) => setEditTitle(e.target.value)}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div className="mb-3">
//             <label className="block text-gray-700 mb-1">Content</label>
//             <textarea
//               value={editContent}
//               onChange={(e) => setEditContent(e.target.value)}
//               className="w-full p-2 border rounded"
//               rows={4}
//             />
//           </div>
//           <div className="flex justify-end space-x-2">
//             <button
//               onClick={() => setEditingAnnouncementId(null)}
//               className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={handleEditAnnouncement}
//               className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
//             >
//               Save Changes
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Announcements List */}
//       {loading ? (
//         <p className="text-gray-500">Loading announcements...</p>
//       ) : announcements.length > 0 ? (
//         <div className="space-y-4">
//           {announcements.map((announcement) => (
//             <div key={announcement.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
//               <div className="flex justify-between">
//                 <h3 className="text-lg font-semibold">{announcement.title}</h3>
//                 <div className="flex space-x-2">
//                   <button
//                     onClick={() => startEditing(announcement)}
//                     className="text-blue-500 hover:text-blue-700"
//                   >
//                     <Edit size={16} />
//                   </button>
//                   <button
//                     onClick={() => handleDeleteAnnouncement(announcement.id)}
//                     className="text-red-500 hover:text-red-700"
//                   >
//                     <Trash2 size={16} />
//                   </button>
//                 </div>
//               </div>
//               <p className="text-gray-700 mt-2">{announcement.content}</p>
//               <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
//                 <div>
//                   <span>Posted by {announcement.author_name}</span>
//                   <span className="mx-2">•</span>
//                   <span>{formatDate(announcement.created_at)}</span>
//                 </div>
//                 {announcement.updated_at && announcement.updated_at !== announcement.created_at && (
//                   <div>
//                     <span>Updated {formatDate(announcement.updated_at)}</span>
//                   </div>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : (
//         <p className="text-gray-500">No announcements have been created yet.</p>
//       )}
//     </div>
//   );
// }
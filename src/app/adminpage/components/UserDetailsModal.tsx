import { useState, useEffect } from 'react';
import { UserDetailsModalProps, EditingCell } from '../types';

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  onClose,
  onStatusClick,
  onEdit,
  onDelete,
  onResetPassword,
  userTypes,
  getUpidLabel,
}) => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const getEditableUserTypes = () => {
    // Always filter out child role (upid 3) from selection
    return userTypes.filter(type => type.id !== 3);
  };

  if (!currentUser) return null;

  const startEditing = (field: string, value: string | number) => {
    setEditingCell({ username: currentUser.username, field, value });
    setSuccessMessage(null);
  };

  const handleSaveChanges = async () => {
    if (!editingCell) return;
    
    try {
      await onEdit(currentUser.username, editingCell.field, editingCell.value);
      setSuccessMessage(`Successfully updated ${editingCell.field}`);
      // Update the current user data immediately
      setCurrentUser(prev => ({
        ...prev,
        [editingCell.field]: editingCell.value
      }));
      setEditingCell(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg w-[1000px]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h3 className="text-2xl font-bold">User Details</h3>
            <button
              onClick={() => onStatusClick(currentUser)}
              className={`px-6 py-2 inline-flex items-center justify-center text-sm leading-5 font-semibold rounded-full whitespace-nowrap min-w-[100px] ${
                currentUser.suspended 
                  ? 'bg-red-900 text-red-200 hover:bg-red-800' 
                  : 'bg-green-900 text-green-200 hover:bg-green-800'
              }`}
            >
              {currentUser.suspended ? 'Suspended' : 'Active'}
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onResetPassword(currentUser)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg"
            >
              Reset Password
            </button>
            <button
              onClick={() => onDelete(currentUser)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Delete User
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-900 text-green-200 rounded animate-fade-in-out">
            {successMessage}
          </div>
        )}

        <div className="space-y-4">
          {editingCell ? (
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="mb-2">
                <label className="text-sm text-gray-400">
                  Editing {editingCell.field === 'upid' ? 'User Type' : editingCell.field.charAt(0).toUpperCase() + editingCell.field.slice(1)}
                </label>
              </div>
              {editingCell.field === 'upid' ? (
                <select
                  value={editingCell.value as number}
                  onChange={(e) => setEditingCell({ ...editingCell, value: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4"
                  autoFocus
                >
                  {getEditableUserTypes().map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              ) : editingCell.field === 'age' ? (
                <input
                  type="number"
                  value={editingCell.value as number}
                  onChange={(e) => setEditingCell({ ...editingCell, value: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4"
                  autoFocus
                />
              ) : (
                <input
                  type="text"
                  value={editingCell.value as string}
                  onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4"
                  autoFocus
                />
              )}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setEditingCell(null);
                    setSuccessMessage(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-4">
                <div 
                  className="col-span-2 bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700"
                  onClick={() => startEditing('fullname', currentUser.fullname)}
                >
                  <div className="text-sm text-gray-400 mb-1">FULL NAME</div>
                  <div className="text-white break-all">{currentUser.fullname}</div>
                </div>
                <div 
                  className="col-span-2 bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700"
                  onClick={() => startEditing('username', currentUser.username)}
                >
                  <div className="text-sm text-gray-400 mb-1">USERNAME</div>
                  <div className="text-white break-all">{currentUser.username}</div>
                </div>
                <div 
                  className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700"
                  onClick={() => startEditing('age', currentUser.age || 0)}
                >
                  <div className="text-sm text-gray-400 mb-1">AGE</div>
                  <div className="text-white">{currentUser.age}</div>
                </div>
                <div 
                  className={`col-span-2 bg-gray-800 p-4 rounded-lg ${currentUser.upid === 3 ? '' : 'cursor-pointer hover:bg-gray-700'}`}
                >
                  <div className="text-sm text-gray-400 mb-1">USER TYPE</div>
                  {currentUser.upid === 3 ? (
                    <div className="text-white">{getUpidLabel(currentUser.upid)}</div>
                  ) : (
                    <div
                      onClick={() => startEditing('upid', currentUser.upid)}
                      className="text-white cursor-pointer"
                    >
                      {getUpidLabel(currentUser.upid)}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">CREATED AT</div>
                  <div className="text-white">{new Date(currentUser.created_at).toLocaleString()}</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">UPDATED AT</div>
                  <div className="text-white">{new Date(currentUser.updated_at).toLocaleString()}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal; 
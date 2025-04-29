import { InvitationStatus } from '../../../types/database.types';

interface StudentCardProps {
  id: string;
  fullname: string;
  username: string;
  status: InvitationStatus;
  onRemove: (id: string) => void;
  showRemoveButton?: boolean;
}

// Avatar component for student display
export const StudentAvatar = ({ 
  fullname,
  status = InvitationStatus.Pending
}: { 
  fullname: string;
  status?: InvitationStatus;
}) => {
  const bgColor = status === InvitationStatus.Rejected 
    ? 'bg-red-100 text-red-800' 
    : 'bg-blue-100 text-blue-800';
  
  return (
    <div className={`${bgColor} rounded-full w-10 h-10 flex items-center justify-center`}>
      {fullname.charAt(0).toUpperCase()}
    </div>
  );
};

// Main student card component
const StudentCard: React.FC<StudentCardProps> = ({
  id,
  fullname,
  username,
  status,
  onRemove,
  showRemoveButton = true
}) => {
  // Only show status badge for non-rejected students
  const showStatusBadge = status !== InvitationStatus.Rejected;
  
  // Determine status badge color for non-rejected students
  const getStatusColor = (status: InvitationStatus) => {
    switch(status) {
      case InvitationStatus.Pending:
        return 'bg-yellow-100 text-yellow-800';
      case InvitationStatus.Accepted:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Status label mapping
  const statusLabels = {
    [InvitationStatus.Accepted]: 'Accepted',
    [InvitationStatus.Pending]: 'Pending',
  };
  
  return (
    <div className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 border-b last:border-b-0">
      <div className="flex items-center space-x-3">
        <StudentAvatar fullname={fullname} status={status} />
        <div>
          <p className="font-medium text-gray-800">{fullname}</p>
          <p className="text-sm text-gray-500">@{username}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {showStatusBadge && (
          <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(status)}`}>
            {statusLabels[status]}
          </span>
        )}
        {showRemoveButton && (
          <button 
            onClick={() => onRemove(id)}
            className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

export default StudentCard;
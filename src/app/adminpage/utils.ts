import { UserAccount } from './types';

export const userTypes = [
  { id: 3, label: 'Child' },
  { id: 2, label: 'Parent' },
  { id: 1, label: 'Publisher' },
  { id: 4, label: 'Educator' },
  { id: 5, label: 'Student' }
];

export const getUpidLabel = (upid: number): string => {
  switch (upid) {
    case 1: return 'Publisher';
    case 2: return 'Parent';
    case 3: return 'Child';
    case 4: return 'Educator';
    case 5: return 'Student';
    default: return 'Unknown';
  }
};

export const getChildrenForParent = (parentUsername: string, userAccounts: UserAccount[], relationships: { parent: string; child: string; }[]) => {
  // First, get the child usernames from isparentof table for this parent
  const childUsernames = relationships
    .filter(rel => rel.parent === parentUsername)
    .map(rel => rel.child);
  
  // Then, get the full user objects for these children from user_account table
  return userAccounts.filter(user => childUsernames.includes(user.username) && user.upid === 3); // upid 3 for Child
};

export const getChildName = (username: string, userAccounts: UserAccount[]) => {
  const child = userAccounts.find(user => user.username === username);
  return child ? child.fullname : username;
};

export const getChildAge = (username: string, userAccounts: UserAccount[]) => {
  const child = userAccounts.find(user => user.username === username);
  return child ? child.age : null;
};

export const getGroupedRelationships = (userAccounts: UserAccount[], relationships: { parent: string; child: string; }[]) => {
  // First, get all parents from user_account
  const allParents = userAccounts.filter(user => user.upid === 2);
  
  // Create a map of existing relationships
  const relationshipMap = relationships.reduce((acc, rel) => {
    if (!acc[rel.parent]) {
      acc[rel.parent] = [];
    }
    acc[rel.parent].push({
      username: rel.child,
      fullname: getChildName(rel.child, userAccounts),
      age: getChildAge(rel.child, userAccounts)
    });
    return acc;
  }, {} as Record<string, { 
    username: string; 
    fullname: string;
    age: number | null;
  }[]>);

  // Create grouped data for all parents
  return allParents.map(parent => ({
    parentUsername: parent.username,
    parentName: parent.fullname,
    parentAge: parent.age,
    children: relationshipMap[parent.username] || []
  }));
};

export const filterAndSortUsers = (
  userAccounts: UserAccount[],
  searchQuery: string,
  selectedStatusFilter: boolean | null,
  selectedUserTypeFilter: number | null,
  sortOrder: 'asc' | 'desc' | null,
  createdAtSort: 'asc' | 'desc' | null,
  updatedAtSort: 'asc' | 'desc' | null
) => {
  return userAccounts
    .filter(user => {
      const matchesSearch = 
        user.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatusFilter === null || user.suspended === selectedStatusFilter;
      
      const matchesUserType = selectedUserTypeFilter === null || user.upid === selectedUserTypeFilter;
      
      return matchesSearch && matchesStatus && matchesUserType;
    })
    .sort((a, b) => {
      if (sortOrder === null && createdAtSort === null && updatedAtSort === null) return 0;
      
      if (sortOrder !== null) {
        // Handle null age values
        const ageA = a.age !== null ? a.age : 0;
        const ageB = b.age !== null ? b.age : 0;
        return sortOrder === 'asc' ? ageA - ageB : ageB - ageA;
      }
      
      if (createdAtSort !== null) {
        return createdAtSort === 'asc' 
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      
      if (updatedAtSort !== null) {
        return updatedAtSort === 'asc'
          ? new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
          : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      
      return 0;
    });
}; 
import React, { useState, useMemo } from 'react';
import { User } from '../types';

/**
 * Props for OnlineUserList component
 */
interface OnlineUserListProps {
  users: User[];
  currentUserIP: string;
  onSelectUser: (user: User) => void;
}

/**
 * OnlineUserList component displays the list of online users with search functionality
 * 
 * Features:
 * - Display online users with IP addresses
 * - Search/filter functionality
 * - User selection (click to auto-fill input)
 * - Empty state display
 * - Responsive design with Tailwind CSS
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8
 */
export function OnlineUserList({ users, currentUserIP, onSelectUser }: OnlineUserListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter users based on search term (excluding current user)
  const filteredUsers = useMemo(() => {
    const otherUsers = users.filter(user => user.ip !== currentUserIP);
    
    if (!searchTerm.trim()) {
      return otherUsers;
    }
    
    return otherUsers.filter(user => 
      user.ip.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
  }, [users, currentUserIP, searchTerm]);

  const handleUserClick = (user: User) => {
    onSelectUser(user);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-3 md:p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-base md:text-lg font-semibold text-gray-800">
          在线用户 ({filteredUsers.length})
        </h2>
      </div>

      {/* Search Input */}
      <div className="relative mb-3 md:mb-4">
        <input
          type="text"
          placeholder="搜索用户 IP..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full px-3 py-2.5 md:py-2 pl-10 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {/* Clear Button */}
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-6 md:py-8">
            {users.filter(user => user.ip !== currentUserIP).length === 0 ? (
              // No other users online
              <>
                <svg
                  className="h-10 md:h-12 w-10 md:w-12 mb-3 md:mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-xs md:text-sm font-medium mb-1">暂无其他用户在线</p>
                <p className="text-xs text-center px-2">
                  等待其他用户连接到局域网...
                </p>
              </>
            ) : (
              // No users match search
              <>
                <svg
                  className="h-10 md:h-12 w-10 md:w-12 mb-3 md:mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <p className="text-xs md:text-sm font-medium mb-1">未找到匹配的用户</p>
                <p className="text-xs text-center px-2">
                  尝试修改搜索条件或清空搜索框
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserClick(user)}
                className="flex items-center justify-between p-2.5 md:p-3 bg-gray-50 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors duration-150 group"
              >
                <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
                  {/* Online Status Indicator */}
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-gray-900 truncate">
                      {user.ip}
                    </p>
                    <p className="text-xs text-gray-500">
                      在线时长: {formatDuration(Date.now() - user.connectedAt)}
                    </p>
                  </div>
                </div>

                {/* Click Indicator */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-2">
                  <svg
                    className="h-4 w-4 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      {filteredUsers.length > 0 && (
        <div className="mt-3 md:mt-4 pt-2 md:pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            点击用户可自动填充到消息输入框
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Format duration in milliseconds to human readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟`;
  } else {
    return `${seconds}秒`;
  }
}

export default OnlineUserList;
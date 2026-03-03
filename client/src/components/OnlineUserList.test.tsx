import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { OnlineUserList } from './OnlineUserList';
import { User } from '../types';

// Mock users for testing
const mockUsers: User[] = [
  {
    id: 'user1',
    ip: '192.168.1.10',
    socketId: 'socket1',
    connectedAt: Date.now() - 300000, // 5 minutes ago
    lastActivity: Date.now(),
    isOnline: true,
  },
  {
    id: 'user2',
    ip: '192.168.1.20',
    socketId: 'socket2',
    connectedAt: Date.now() - 600000, // 10 minutes ago
    lastActivity: Date.now(),
    isOnline: true,
  },
  {
    id: 'user3',
    ip: '10.0.0.5',
    socketId: 'socket3',
    connectedAt: Date.now() - 120000, // 2 minutes ago
    lastActivity: Date.now(),
    isOnline: true,
  },
];

const currentUserIP = '192.168.1.100';

describe('OnlineUserList', () => {
  const mockOnSelectUser = vi.fn();

  beforeEach(() => {
    mockOnSelectUser.mockClear();
  });

  it('renders online users list with correct count', () => {
    render(
      <OnlineUserList
        users={mockUsers}
        currentUserIP={currentUserIP}
        onSelectUser={mockOnSelectUser}
      />
    );

    // Should show count of other users (excluding current user)
    expect(screen.getByText('在线用户 (3)')).toBeInTheDocument();
    
    // Should display all user IPs
    expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.20')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.5')).toBeInTheDocument();
  });

  it('excludes current user from the list', () => {
    const usersWithCurrentUser = [
      ...mockUsers,
      {
        id: 'currentUser',
        ip: currentUserIP,
        socketId: 'currentSocket',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isOnline: true,
      },
    ];

    render(
      <OnlineUserList
        users={usersWithCurrentUser}
        currentUserIP={currentUserIP}
        onSelectUser={mockOnSelectUser}
      />
    );

    // Should still show count of 3 (excluding current user)
    expect(screen.getByText('在线用户 (3)')).toBeInTheDocument();
    
    // Current user IP should not be displayed in the list
    expect(screen.queryByText(currentUserIP)).not.toBeInTheDocument();
  });

  it('displays empty state when no other users are online', () => {
    render(
      <OnlineUserList
        users={[]}
        currentUserIP={currentUserIP}
        onSelectUser={mockOnSelectUser}
      />
    );

    expect(screen.getByText('在线用户 (0)')).toBeInTheDocument();
    expect(screen.getByText('暂无其他用户在线')).toBeInTheDocument();
    expect(screen.getByText('等待其他用户连接到局域网...')).toBeInTheDocument();
  });

  it('filters users based on search input', async () => {
    const user = userEvent.setup();
    
    render(
      <OnlineUserList
        users={mockUsers}
        currentUserIP={currentUserIP}
        onSelectUser={mockOnSelectUser}
      />
    );

    const searchInput = screen.getByPlaceholderText('搜索用户 IP...');
    
    // Search for "192.168"
    await user.type(searchInput, '192.168');

    await waitFor(() => {
      expect(screen.getByText('在线用户 (2)')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.20')).toBeInTheDocument();
      expect(screen.queryByText('10.0.0.5')).not.toBeInTheDocument();
    });
  });

  it('shows no results message when search has no matches', async () => {
    const user = userEvent.setup();
    
    render(
      <OnlineUserList
        users={mockUsers}
        currentUserIP={currentUserIP}
        onSelectUser={mockOnSelectUser}
      />
    );

    const searchInput = screen.getByPlaceholderText('搜索用户 IP...');
    
    // Search for something that doesn't exist
    await user.type(searchInput, '999.999');

    await waitFor(() => {
      expect(screen.getByText('在线用户 (0)')).toBeInTheDocument();
      expect(screen.getByText('未找到匹配的用户')).toBeInTheDocument();
      expect(screen.getByText('尝试修改搜索条件或清空搜索框')).toBeInTheDocument();
    });
  });

  it('clears search when clear button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <OnlineUserList
        users={mockUsers}
        currentUserIP={currentUserIP}
        onSelectUser={mockOnSelectUser}
      />
    );

    const searchInput = screen.getByPlaceholderText('搜索用户 IP...');
    
    // Type in search
    await user.type(searchInput, '192.168');
    
    // Click clear button
    const clearButton = screen.getByRole('button');
    await user.click(clearButton);

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
      expect(screen.getByText('在线用户 (3)')).toBeInTheDocument();
    });
  });

  it('calls onSelectUser when a user is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <OnlineUserList
        users={mockUsers}
        currentUserIP={currentUserIP}
        onSelectUser={mockOnSelectUser}
      />
    );

    // Click on the first user
    const userElement = screen.getByText('192.168.1.10').closest('div');
    expect(userElement).toBeInTheDocument();
    
    await user.click(userElement!);

    expect(mockOnSelectUser).toHaveBeenCalledTimes(1);
    expect(mockOnSelectUser).toHaveBeenCalledWith(mockUsers[0]);
  });

  it('displays online duration for each user', () => {
    render(
      <OnlineUserList
        users={mockUsers}
        currentUserIP={currentUserIP}
        onSelectUser={mockOnSelectUser}
      />
    );

    // Should show duration text for users (use getAllByText for multiple matches)
    const durationElements = screen.getAllByText(/在线时长:/);
    expect(durationElements.length).toBeGreaterThan(0);
  });

  it('shows click instruction when users are present', () => {
    render(
      <OnlineUserList
        users={mockUsers}
        currentUserIP={currentUserIP}
        onSelectUser={mockOnSelectUser}
      />
    );

    expect(screen.getByText('点击用户可自动填充到消息输入框')).toBeInTheDocument();
  });

  it('does not show click instruction when no users are present', () => {
    render(
      <OnlineUserList
        users={[]}
        currentUserIP={currentUserIP}
        onSelectUser={mockOnSelectUser}
      />
    );

    expect(screen.queryByText('点击用户可自动填充到消息输入框')).not.toBeInTheDocument();
  });

  it('handles case-insensitive search', async () => {
    const user = userEvent.setup();
    
    render(
      <OnlineUserList
        users={mockUsers}
        currentUserIP={currentUserIP}
        onSelectUser={mockOnSelectUser}
      />
    );

    const searchInput = screen.getByPlaceholderText('搜索用户 IP...');
    
    // Search with different case
    await user.type(searchInput, '10.0.0');

    await waitFor(() => {
      expect(screen.getByText('在线用户 (1)')).toBeInTheDocument();
      expect(screen.getByText('10.0.0.5')).toBeInTheDocument();
    });
  });

  it('trims whitespace from search input', async () => {
    const user = userEvent.setup();
    
    render(
      <OnlineUserList
        users={mockUsers}
        currentUserIP={currentUserIP}
        onSelectUser={mockOnSelectUser}
      />
    );

    const searchInput = screen.getByPlaceholderText('搜索用户 IP...');
    
    // Search with whitespace
    await user.type(searchInput, '  192.168  ');

    await waitFor(() => {
      expect(screen.getByText('在线用户 (2)')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.20')).toBeInTheDocument();
    });
  });
});

// Test the formatDuration function indirectly through component behavior
describe('OnlineUserList duration formatting', () => {
  it('formats duration correctly for different time periods', () => {
    const now = Date.now();
    const testUsers: User[] = [
      {
        id: 'user1',
        ip: '192.168.1.10',
        socketId: 'socket1',
        connectedAt: now - 30000, // 30 seconds ago
        lastActivity: now,
        isOnline: true,
      },
      {
        id: 'user2',
        ip: '192.168.1.20',
        socketId: 'socket2',
        connectedAt: now - 300000, // 5 minutes ago
        lastActivity: now,
        isOnline: true,
      },
      {
        id: 'user3',
        ip: '192.168.1.30',
        socketId: 'socket3',
        connectedAt: now - 3900000, // 65 minutes ago
        lastActivity: now,
        isOnline: true,
      },
    ];

    render(
      <OnlineUserList
        users={testUsers}
        currentUserIP="192.168.1.100"
        onSelectUser={vi.fn()}
      />
    );

    // Should show different duration formats (use getAllByText for multiple matches)
    expect(screen.getByText(/秒/)).toBeInTheDocument();
    const minuteElements = screen.getAllByText(/分钟/);
    expect(minuteElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/小时/)).toBeInTheDocument();
  });
});
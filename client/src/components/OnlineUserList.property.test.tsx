import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import { vi, afterEach } from 'vitest';
import { OnlineUserList } from './OnlineUserList';
import { User } from '../types';

/**
 * Property-Based Tests for OnlineUserList Component
 * 
 * These tests verify universal properties that should hold across all inputs
 * using fast-check library for comprehensive input coverage.
 */

// Clean up after each test to avoid DOM pollution
afterEach(() => {
  cleanup();
});

// Arbitrary generators for property-based testing
const ipv4Arbitrary = fc.tuple(
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 })
).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

const userArbitrary = fc.record({
  id: fc.uuid(),
  ip: ipv4Arbitrary,
  socketId: fc.uuid(),
  connectedAt: fc.integer({ min: 0, max: Date.now() }),
  lastActivity: fc.integer({ min: 0, max: Date.now() }),
  isOnline: fc.constant(true), // For online user list, all users should be online
});

const usersArrayArbitrary = fc.array(userArbitrary, { minLength: 0, maxLength: 10 });

// Safe search string generator that avoids userEvent special characters
const safeSearchStringArbitrary = fc.oneof(
  fc.string({ minLength: 0, maxLength: 8 }).filter(s => 
    // Filter out userEvent special characters that cause keyboard parsing errors
    !/[{}[\]<>]/.test(s)
  ), 
  fc.string({ minLength: 1, maxLength: 3 }).map(s => s.replace(/[^0-9.]/g, '')), // IP-like strings
  fc.constantFrom('192', '168', '10', '172', '127', '0', '1', '255'), // Common IP segments
  fc.constant(''), // Empty string
);

describe('OnlineUserList Property-Based Tests', () => {
  /**
   * Feature: lan-messaging-app, Property 13: 用户过滤功能
   * 
   * **验证需求: 2.4**
   * 
   * 对于任意在线用户列表和任意搜索字符串，过滤后的结果应该只包含
   * IP地址中包含该搜索字符串的用户。
   */
  describe('Property 13: User Filtering Functionality', () => {
    it('should only include users whose IP addresses contain the search string', async () => {
      await fc.assert(
        fc.asyncProperty(
          usersArrayArbitrary,
          ipv4Arbitrary, // currentUserIP
          safeSearchStringArbitrary,
          async (users, currentUserIP, searchString) => {
            // Ensure we have unique IPs to avoid conflicts
            const uniqueUsers = users.reduce((acc: User[], user) => {
              if (!acc.some(u => u.ip === user.ip)) {
                acc.push(user);
              }
              return acc;
            }, []);

            const mockOnSelectUser = vi.fn();
            const user = userEvent.setup();

            const { unmount } = render(
              <OnlineUserList
                users={uniqueUsers}
                currentUserIP={currentUserIP}
                onSelectUser={mockOnSelectUser}
              />
            );

            try {
              // Get the search input and simulate typing
              const searchInput = screen.getByPlaceholderText('搜索用户 IP...');
              
              // Clear any existing value and type the search string
              await user.clear(searchInput);
              if (searchString) {
                await user.type(searchInput, searchString);
              }

              // Wait for the component to update
              await waitFor(() => {
                // Get all users excluding current user
                const otherUsers = uniqueUsers.filter(u => u.ip !== currentUserIP);
                
                // Calculate expected filtered users
                const trimmedSearch = searchString.toLowerCase().trim();
                const expectedFilteredUsers = trimmedSearch === '' 
                  ? otherUsers 
                  : otherUsers.filter(u => 
                      u.ip.toLowerCase().includes(trimmedSearch)
                    );

                // Check that the displayed count matches expected count
                const countRegex = new RegExp(`在线用户 \\(${expectedFilteredUsers.length}\\)`);
                expect(screen.getByText(countRegex)).toBeInTheDocument();

                // If we have expected users, verify they are displayed
                if (expectedFilteredUsers.length > 0) {
                  expectedFilteredUsers.forEach(expectedUser => {
                    expect(screen.getByText(expectedUser.ip)).toBeInTheDocument();
                  });
                }

                // Verify that non-matching users are not displayed
                const nonMatchingUsers = otherUsers.filter(u => !expectedFilteredUsers.includes(u));
                nonMatchingUsers.forEach(nonMatchingUser => {
                  expect(screen.queryByText(nonMatchingUser.ip)).not.toBeInTheDocument();
                });
              });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 30, verbose: true }
      );
    });

    it('should exclude current user from filtering regardless of search string', async () => {
      await fc.assert(
        fc.asyncProperty(
          usersArrayArbitrary.filter(users => users.length > 0),
          safeSearchStringArbitrary,
          async (users, searchString) => {
            // Ensure we have at least one user and pick one as current user
            if (users.length === 0) return true; // Skip empty arrays

            const currentUser = users[0];
            const currentUserIP = currentUser.ip;

            const mockOnSelectUser = vi.fn();
            const user = userEvent.setup();

            const { unmount } = render(
              <OnlineUserList
                users={users}
                currentUserIP={currentUserIP}
                onSelectUser={mockOnSelectUser}
              />
            );

            try {
              const searchInput = screen.getByPlaceholderText('搜索用户 IP...');
              await user.clear(searchInput);
              if (searchString) {
                await user.type(searchInput, searchString);
              }

              await waitFor(() => {
                // Current user should never appear in the list, regardless of search
                expect(screen.queryByText(currentUserIP)).not.toBeInTheDocument();
                
                // The count should never include the current user
                const otherUsers = users.filter(u => u.ip !== currentUserIP);
                const trimmedSearch = searchString.toLowerCase().trim();
                const expectedCount = trimmedSearch === '' 
                  ? otherUsers.length 
                  : otherUsers.filter(u => 
                      u.ip.toLowerCase().includes(trimmedSearch)
                    ).length;

                const countRegex = new RegExp(`在线用户 \\(${expectedCount}\\)`);
                expect(screen.getByText(countRegex)).toBeInTheDocument();
              });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 30, verbose: true }
      );
    });

    it('should show appropriate empty states', async () => {
      await fc.assert(
        fc.asyncProperty(
          usersArrayArbitrary,
          ipv4Arbitrary,
          safeSearchStringArbitrary,
          async (users, currentUserIP, searchString) => {
            const uniqueUsers = users.reduce((acc: User[], user) => {
              if (!acc.some(u => u.ip === user.ip)) {
                acc.push(user);
              }
              return acc;
            }, []);

            const mockOnSelectUser = vi.fn();
            const user = userEvent.setup();

            const { unmount } = render(
              <OnlineUserList
                users={uniqueUsers}
                currentUserIP={currentUserIP}
                onSelectUser={mockOnSelectUser}
              />
            );

            try {
              const searchInput = screen.getByPlaceholderText('搜索用户 IP...');
              await user.clear(searchInput);
              if (searchString) {
                await user.type(searchInput, searchString);
              }

              await waitFor(() => {
                const otherUsers = uniqueUsers.filter(u => u.ip !== currentUserIP);
                const trimmedSearch = searchString.toLowerCase().trim();
                const filteredUsers = trimmedSearch === '' 
                  ? otherUsers 
                  : otherUsers.filter(u => 
                      u.ip.toLowerCase().includes(trimmedSearch)
                    );

                if (otherUsers.length === 0) {
                  // No other users online
                  expect(screen.getByText('暂无其他用户在线')).toBeInTheDocument();
                } else if (filteredUsers.length === 0 && trimmedSearch !== '') {
                  // No users match search
                  expect(screen.getByText('未找到匹配的用户')).toBeInTheDocument();
                } else if (filteredUsers.length > 0) {
                  // Users are displayed, should show footer instruction
                  expect(screen.getByText('点击用户可自动填充到消息输入框')).toBeInTheDocument();
                }
              });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 30, verbose: true }
      );
    });
  });
});
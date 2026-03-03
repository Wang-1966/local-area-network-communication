import { Injectable } from '@nestjs/common';
import { User } from '../types/user.interface';

/**
 * UserRepository manages online users in memory
 * Uses a Map to store users with socketId as key
 */
@Injectable()
export class UserRepository {
  private users: Map<string, User> = new Map();

  /**
   * Add a new user to the repository
   * @param user - User object to add
   */
  add(user: User): void {
    this.users.set(user.socketId, user);
  }

  /**
   * Remove a user from the repository by socketId
   * @param socketId - Socket ID of the user to remove
   * @returns The removed user or null if not found
   */
  remove(socketId: string): User | null {
    const user = this.users.get(socketId);
    if (user) {
      this.users.delete(socketId);
      return user;
    }
    return null;
  }

  /**
   * Find a user by socketId
   * @param socketId - Socket ID to search for
   * @returns User object or null if not found
   */
  findBySocketId(socketId: string): User | null {
    return this.users.get(socketId) || null;
  }

  /**
   * Find a user by IP address
   * @param ip - IP address to search for
   * @returns User object or null if not found
   */
  findByIP(ip: string): User | null {
    for (const user of this.users.values()) {
      if (user.ip === ip) {
        return user;
      }
    }
    return null;
  }

  /**
   * Get all users in the repository
   * @returns Array of all users
   */
  findAll(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * Update a user in the repository
   * @param socketId - Socket ID of the user to update
   * @param updates - Partial user object with fields to update
   * @returns Updated user or null if not found
   */
  update(socketId: string, updates: Partial<User>): User | null {
    const user = this.users.get(socketId);
    if (user) {
      const updatedUser = { ...user, ...updates };
      this.users.set(socketId, updatedUser);
      return updatedUser;
    }
    return null;
  }

  /**
   * Get the count of users in the repository
   * @returns Number of users
   */
  count(): number {
    return this.users.size;
  }

  /**
   * Clear all users from the repository
   */
  clear(): void {
    this.users.clear();
  }
}

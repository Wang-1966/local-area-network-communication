import { Injectable } from '@nestjs/common';
import { User } from '../types';
import { UserRepository } from '../repositories/user.repository';

/**
 * User Service - 管理用户业务逻辑
 */
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * 注册新用户连接
   */
  registerUser(socketId: string, ip: string): User {
    const now = Date.now();
    const user: User = {
      id: socketId,
      ip,
      socketId,
      connectedAt: now,
      lastActivity: now,
      isOnline: true,
    };

    this.userRepository.add(user);
    return user;
  }

  /**
   * 移除用户连接
   */
  removeUser(socketId: string): User | null {
    return this.userRepository.remove(socketId);
  }

  /**
   * 获取所有在线用户
   */
  getOnlineUsers(): User[] {
    return this.userRepository.findAll().filter((user) => user.isOnline);
  }

  /**
   * 根据IP查找用户
   */
  findUserByIP(ip: string): User | null {
    return this.userRepository.findByIP(ip);
  }

  /**
   * 根据Socket ID查找用户
   */
  findUserBySocketId(socketId: string): User | null {
    return this.userRepository.findBySocketId(socketId);
  }

  /**
   * 更新用户最后活跃时间
   */
  updateUserActivity(socketId: string): void {
    this.userRepository.update(socketId, {
      lastActivity: Date.now(),
    });
  }

  /**
   * 获取在线用户数量
   */
  getOnlineUserCount(): number {
    return this.getOnlineUsers().length;
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(ip: string): boolean {
    const user = this.findUserByIP(ip);
    return user !== null && user.isOnline;
  }

  /**
   * 清理不活跃用户（可选，用于心跳超时）
   */
  cleanupInactiveUsers(timeoutMs: number): User[] {
    const now = Date.now();
    const allUsers = this.userRepository.findAll();
    const inactiveUsers: User[] = [];

    for (const user of allUsers) {
      if (now - user.lastActivity > timeoutMs) {
        const removed = this.removeUser(user.socketId);
        if (removed) {
          inactiveUsers.push(removed);
        }
      }
    }

    return inactiveUsers;
  }
}

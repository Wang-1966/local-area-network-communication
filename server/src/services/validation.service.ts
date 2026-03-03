import { Injectable } from '@nestjs/common';
import { ValidationResult, SendMessageDto } from '../types';

/**
 * Validation Service - 处理输入验证
 */
@Injectable()
export class ValidationService {
  private readonly maxMessageLength = 1000;

  /**
   * 验证IP地址格式
   */
  validateIPAddress(ip: string): ValidationResult {
    if (!ip || typeof ip !== 'string') {
      return { isValid: false, error: 'IP地址不能为空' };
    }

    // IPv4 格式验证
    const ipv4Regex =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    if (!ipv4Regex.test(ip)) {
      return { isValid: false, error: 'IP地址格式无效' };
    }

    return { isValid: true };
  }

  /**
   * 验证消息内容
   */
  validateMessageContent(content: string): ValidationResult {
    if (!content || typeof content !== 'string') {
      return { isValid: false, error: '消息内容不能为空' };
    }

    // 去除空白字符后检查
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return { isValid: false, error: '消息内容不能为空' };
    }

    return { isValid: true };
  }

  /**
   * 验证消息长度
   */
  validateMessageLength(content: string, maxLength?: number): ValidationResult {
    const limit = maxLength || this.maxMessageLength;

    if (content.length > limit) {
      return {
        isValid: false,
        error: `消息长度超过限制（最大${limit}字符）`,
      };
    }

    return { isValid: true };
  }

  /**
   * 综合验证发送消息请求
   */
  validateSendMessageRequest(dto: SendMessageDto): ValidationResult {
    // 检查DTO是否存在
    if (!dto || typeof dto !== 'object') {
      return { isValid: false, error: '请求数据无效' };
    }

    // 验证目标IP
    const ipValidation = this.validateIPAddress(dto.targetIP);
    if (!ipValidation.isValid) {
      return ipValidation;
    }

    // 验证消息内容
    const contentValidation = this.validateMessageContent(dto.content);
    if (!contentValidation.isValid) {
      return contentValidation;
    }

    // 验证消息长度
    const lengthValidation = this.validateMessageLength(dto.content);
    if (!lengthValidation.isValid) {
      return lengthValidation;
    }

    return { isValid: true };
  }
}

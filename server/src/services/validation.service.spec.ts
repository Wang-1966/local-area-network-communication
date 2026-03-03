import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from './validation.service';
import * as fc from 'fast-check';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Unit Tests', () => {
    describe('validateIPAddress', () => {
      it('should validate correct IPv4 addresses', () => {
        const validIPs = [
          '192.168.1.1',
          '10.0.0.1',
          '172.16.0.1',
          '127.0.0.1',
          '255.255.255.255',
          '0.0.0.0',
        ];

        validIPs.forEach(ip => {
          const result = service.validateIPAddress(ip);
          expect(result.isValid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });

      it('should reject invalid IP addresses', () => {
        const invalidIPs = [
          '256.1.1.1',
          '192.168.1',
          '192.168.1.1.1',
          'not.an.ip.address',
          '192.168.-1.1',
          '192.168.1.256',
          '',
          '   ',
        ];

        invalidIPs.forEach(ip => {
          const result = service.validateIPAddress(ip);
          expect(result.isValid).toBe(false);
          expect(result.error).toBeDefined();
        });
      });

      it('should handle null and undefined inputs', () => {
        expect(service.validateIPAddress(null as any).isValid).toBe(false);
        expect(service.validateIPAddress(undefined as any).isValid).toBe(false);
      });
    });

    describe('validateMessageContent', () => {
      it('should validate non-empty messages', () => {
        const validMessages = [
          'Hello',
          'Hello World!',
          '你好',
          '123',
          'a',
          'Message with spaces',
        ];

        validMessages.forEach(message => {
          const result = service.validateMessageContent(message);
          expect(result.isValid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });

      it('should reject empty or whitespace-only messages', () => {
        const invalidMessages = [
          '',
          '   ',
          '\t',
          '\n',
          '  \t  \n  ',
        ];

        invalidMessages.forEach(message => {
          const result = service.validateMessageContent(message);
          expect(result.isValid).toBe(false);
          expect(result.error).toBeDefined();
        });
      });

      it('should handle null and undefined inputs', () => {
        expect(service.validateMessageContent(null as any).isValid).toBe(false);
        expect(service.validateMessageContent(undefined as any).isValid).toBe(false);
      });
    });

    describe('validateMessageLength', () => {
      it('should validate messages within length limit', () => {
        const result1 = service.validateMessageLength('Hello');
        expect(result1.isValid).toBe(true);

        const result2 = service.validateMessageLength('a'.repeat(1000));
        expect(result2.isValid).toBe(true);

        const result3 = service.validateMessageLength('Hello', 10);
        expect(result3.isValid).toBe(true);
      });

      it('should reject messages exceeding length limit', () => {
        const result1 = service.validateMessageLength('a'.repeat(1001));
        expect(result1.isValid).toBe(false);
        expect(result1.error).toContain('1000');

        const result2 = service.validateMessageLength('Hello World', 5);
        expect(result2.isValid).toBe(false);
        expect(result2.error).toContain('5');
      });
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Validates: Requirements 6.1, 6.2**
     * 
     * Property 8: IP地址格式验证
     * 
     * 对于任意字符串，IP地址验证函数应该正确识别有效的IPv4地址格式（例如：192.168.1.1），
     * 并拒绝无效格式。
     */
    describe('Property 8: IP Address Format Validation', () => {
      it('should correctly validate valid IPv4 addresses', () => {
        fc.assert(
          fc.property(
            fc.tuple(
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 })
            ),
            ([a, b, c, d]) => {
              const validIP = `${a}.${b}.${c}.${d}`;
              const result = service.validateIPAddress(validIP);
              expect(result.isValid).toBe(true);
              expect(result.error).toBeUndefined();
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject strings that are not valid IPv4 format', () => {
        fc.assert(
          fc.property(
            fc.oneof(
              // Invalid octet values (> 255)
              fc.tuple(
                fc.integer({ min: 256, max: 999 }),
                fc.integer({ min: 0, max: 255 }),
              ).map(([a, b]) => `${a}.${b}.0.1`),
              
              // Too few octets
              fc.tuple(
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 0, max: 255 }),
              ).map(([a, b]) => `${a}.${b}`),
              
              // Too many octets
              fc.tuple(
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 0, max: 255 }),
              ).map(([a, b, c, d, e]) => `${a}.${b}.${c}.${d}.${e}`),
              
              // Non-numeric strings
              fc.string().filter(s => !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s)),
              
              // Empty or whitespace strings
              fc.oneof(
                fc.constant(''),
                fc.string().filter(s => s.trim() === '' && s.length > 0)
              )
            ),
            (invalidIP) => {
              const result = service.validateIPAddress(invalidIP);
              expect(result.isValid).toBe(false);
              expect(result.error).toBeDefined();
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle any string input gracefully', () => {
        fc.assert(
          fc.property(
            fc.string(),
            (input) => {
              const result = service.validateIPAddress(input);
              expect(typeof result.isValid).toBe('boolean');
              if (!result.isValid) {
                expect(typeof result.error).toBe('string');
                expect(result.error!.length).toBeGreaterThan(0);
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    /**
     * **Validates: Requirements 6.3, 6.4, 6.5**
     * 
     * Property 9: 消息内容验证
     * 
     * 对于任意字符串，消息验证函数应该：
     * - 拒绝空字符串或仅包含空白字符的字符串
     * - 拒绝长度超过1000字符的字符串
     * - 接受长度在1-1000字符之间的非空字符串
     */
    describe('Property 9: Message Content Validation', () => {
      it('should accept non-empty strings with length between 1-1000 characters', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
            (validMessage) => {
              const contentResult = service.validateMessageContent(validMessage);
              expect(contentResult.isValid).toBe(true);
              expect(contentResult.error).toBeUndefined();

              const lengthResult = service.validateMessageLength(validMessage);
              expect(lengthResult.isValid).toBe(true);
              expect(lengthResult.error).toBeUndefined();
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject empty strings or strings containing only whitespace characters', () => {
        fc.assert(
          fc.property(
            fc.oneof(
              fc.constant(''),
              fc.string().filter(s => s.length > 0 && s.trim().length === 0)
            ),
            (emptyOrWhitespaceMessage) => {
              const result = service.validateMessageContent(emptyOrWhitespaceMessage);
              expect(result.isValid).toBe(false);
              expect(result.error).toBeDefined();
              expect(result.error).toContain('不能为空');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject strings longer than 1000 characters', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1001, maxLength: 2000 }),
            (longMessage) => {
              const result = service.validateMessageLength(longMessage);
              expect(result.isValid).toBe(false);
              expect(result.error).toBeDefined();
              expect(result.error).toContain('超过限制');
              expect(result.error).toContain('1000');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle custom length limits correctly', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 100 }),
            fc.string({ minLength: 1, maxLength: 200 }),
            (customLimit, message) => {
              const result = service.validateMessageLength(message, customLimit);
              
              if (message.length <= customLimit) {
                expect(result.isValid).toBe(true);
                expect(result.error).toBeUndefined();
              } else {
                expect(result.isValid).toBe(false);
                expect(result.error).toBeDefined();
                expect(result.error).toContain(customLimit.toString());
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should validate message content and length consistently', () => {
        fc.assert(
          fc.property(
            fc.string(),
            (message) => {
              const contentResult = service.validateMessageContent(message);
              const lengthResult = service.validateMessageLength(message);
              
              // Both should return ValidationResult objects
              expect(typeof contentResult.isValid).toBe('boolean');
              expect(typeof lengthResult.isValid).toBe('boolean');
              
              // If content is invalid (empty/whitespace), length validation should still work
              if (!contentResult.isValid) {
                expect(typeof contentResult.error).toBe('string');
              }
              
              // If length is invalid (> 1000), content validation might still pass
              if (!lengthResult.isValid) {
                expect(typeof lengthResult.error).toBe('string');
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Combined Validation Properties', () => {
      it('should validate SendMessageDto requests consistently', () => {
        fc.assert(
          fc.property(
            fc.record({
              targetIP: fc.oneof(
                fc.tuple(
                  fc.integer({ min: 0, max: 255 }),
                  fc.integer({ min: 0, max: 255 }),
                  fc.integer({ min: 0, max: 255 }),
                  fc.integer({ min: 0, max: 255 })
                ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
                fc.string()
              ),
              content: fc.string()
            }),
            (dto) => {
              const result = service.validateSendMessageRequest(dto);
              
              // Should always return a ValidationResult
              expect(typeof result.isValid).toBe('boolean');
              
              if (!result.isValid) {
                expect(typeof result.error).toBe('string');
                expect(result.error!.length).toBeGreaterThan(0);
              }
              
              // Individual validations should be consistent with combined validation
              const ipResult = service.validateIPAddress(dto.targetIP);
              const contentResult = service.validateMessageContent(dto.content);
              const lengthResult = service.validateMessageLength(dto.content);
              
              // If any individual validation fails, combined should fail
              if (!ipResult.isValid || !contentResult.isValid || !lengthResult.isValid) {
                expect(result.isValid).toBe(false);
              }
              
              // If all individual validations pass, combined should pass
              if (ipResult.isValid && contentResult.isValid && lengthResult.isValid) {
                expect(result.isValid).toBe(true);
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
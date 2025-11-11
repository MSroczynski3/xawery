import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPrismaClient, checkDatabaseHealth } from '../db';

describe('Database Utilities', () => {
  describe('getPrismaClient', () => {
    it('should return a Prisma client instance', () => {
      const client = getPrismaClient();
      expect(client).toBeDefined();
      expect(client.$queryRaw).toBeDefined();
      expect(client.$disconnect).toBeDefined();
    });

    it('should return the same instance (singleton)', () => {
      const client1 = getPrismaClient();
      const client2 = getPrismaClient();
      expect(client1).toBe(client2);
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should return true when database is healthy', async () => {
      const isHealthy = await checkDatabaseHealth();
      expect(isHealthy).toBe(true);
    });

    it('should return false when database query fails', async () => {
      // Mock the Prisma client to simulate failure
      const client = getPrismaClient();
      const originalQueryRaw = client.$queryRaw;
      
      // Temporarily replace with failing mock
      client.$queryRaw = vi.fn().mockRejectedValue(new Error('Connection failed'));
      
      const isHealthy = await checkDatabaseHealth();
      expect(isHealthy).toBe(false);
      
      // Restore original
      client.$queryRaw = originalQueryRaw;
    });
  });
});


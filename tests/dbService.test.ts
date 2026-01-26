import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dbService, APP_VERSION } from '../services/dbService';
import { FeedSourceType } from '../types';

describe('dbService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default data', () => {
    const data = dbService.getData();
    expect(data.version).toBe(APP_VERSION);
    expect(data.shelves.length).toBeGreaterThan(0);
    expect(data.shelves[0].id).toBe('default-queue');
  });

  it('should maintain a circular buffer for logs', () => {
    for (let i = 0; i < 110; i++) {
      dbService.addLog('info', `Log ${i}`);
    }
    const data = dbService.getData();
    expect(data.logs.length).toBe(100);
    expect(data.logs[0].message).toBe('Log 109');
  });

  it('should purge logs automatically when version changes', () => {
    const oldData = {
      version: '1.5.1',
      logs: [{ message: 'Old Log' }],
      articles: [],
      books: [],
      notes: [],
      shelves: []
    };
    localStorage.setItem('scidigest_data_v1', JSON.stringify(oldData));
    
    const data = dbService.getData();
    expect(data.version).toBe(APP_VERSION);
    // It will have 1 log indicating the purge
    expect(data.logs.some(l => l.message.includes('Version updated'))).toBe(true);
    expect(data.logs.length).toBe(1);
  });

  it('should handle interests persistence', () => {
    const myInterests = ['AI', 'Quantum'];
    dbService.saveInterests(myInterests);
    expect(dbService.getInterests()).toEqual(myInterests);
  });
});
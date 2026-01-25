
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dbService, APP_VERSION } from '../services/dbService';

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

  it('should add an article', () => {
    const mockArticle = {
      id: 'test-1',
      title: 'Test Paper',
      authors: ['Author'],
      abstract: 'Abstract',
      date: '2024-01-01',
      year: '2024',
      source: 'Manual' as any,
      rating: 5,
      tags: [],
      isBookmarked: false,
      notes: '',
      noteIds: [],
      userReadTime: 0,
      shelfIds: []
    };
    dbService.addArticle(mockArticle as any);
    const data = dbService.getData();
    expect(data.articles.length).toBe(1);
    expect(data.articles[0].title).toBe('Test Paper');
  });

  it('should generate a sync key if none exists', () => {
    const key = dbService.getSyncKey();
    expect(key).toBeDefined();
    expect(key.length).toBeGreaterThan(0);
  });
});

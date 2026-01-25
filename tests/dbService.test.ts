
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dbService, APP_VERSION } from '../services/dbService';
import { FeedSourceType } from '../types';

describe('dbService', () => {
  beforeEach(() => {
    localStorage.clear();
    // Re-initialize state to default
  });

  it('should initialize with default data', () => {
    const data = dbService.getData();
    expect(data.version).toBe(APP_VERSION);
    expect(data.shelves.length).toBeGreaterThan(0);
    expect(data.shelves[0].id).toBe('default-queue');
  });

  it('should add and update an article', () => {
    const mockArticle = {
      id: 'test-1',
      title: 'Test Paper',
      authors: ['Author'],
      abstract: 'Abstract',
      date: '2024-01-01',
      year: '2024',
      source: FeedSourceType.MANUAL,
      rating: 5,
      tags: [],
      isBookmarked: false,
      notes: '',
      noteIds: [],
      userReadTime: 0,
      shelfIds: []
    };
    dbService.addArticle(mockArticle as any);
    let data = dbService.getData();
    expect(data.articles.length).toBe(1);

    dbService.updateArticle('test-1', { rating: 10 });
    data = dbService.getData();
    expect(data.articles[0].rating).toBe(10);
  });

  it('should handle notes linking and unlinking', () => {
    const note = {
      id: 'n1',
      title: 'My Note',
      content: 'Content',
      articleIds: [],
      lastEdited: new Date().toISOString()
    };
    const article = { id: 'a1', title: 'Art 1', authors: [], abstract: '', date: '', year: '', source: FeedSourceType.MANUAL, rating: 0, tags: [], isBookmarked: false, notes: '', noteIds: [], userReadTime: 0, shelfIds: [], userReviews: { sentiment: 'Neutral', summary: '' } };
    
    dbService.addNote(note as any);
    dbService.addArticle(article as any);
    
    dbService.linkNoteToArticle('n1', 'a1');
    let data = dbService.getData();
    expect(data.notes[0].articleIds).toContain('a1');
    expect(data.articles[0].noteIds).toContain('n1');

    dbService.unlinkNoteFromArticle('n1', 'a1');
    data = dbService.getData();
    expect(data.notes[0].articleIds).not.toContain('a1');
  });

  it('should maintain a circular buffer for logs', () => {
    // MAX_LOG_ENTRIES is 50
    for (let i = 0; i < 60; i++) {
      dbService.addLog('info', `Log ${i}`);
    }
    const data = dbService.getData();
    expect(data.logs.length).toBe(50);
    expect(data.logs[0].message).toBe('Log 59');
  });

  it('should correctly handle interests persistence', () => {
    const myInterests = ['AI', 'Quantum'];
    dbService.saveInterests(myInterests);
    expect(dbService.getInterests()).toEqual(myInterests);
  });

  it('should migrate data correctly when version changes', () => {
    const oldData = {
      version: '0.0.1',
      articles: [{ id: '1', title: 'Old', isInQueue: true }], // Migration of isInQueue to shelfIds
      logs: [{ message: 'Old Log' }]
    };
    localStorage.setItem('scidigest_data_v1', JSON.stringify(oldData));
    
    const data = dbService.getData();
    expect(data.version).toBe(APP_VERSION);
    expect(data.articles[0].shelfIds).toContain('default-queue');
    expect(data.logs.length).toBe(0); // Version update purges diagnostic buffer
  });
});


import { describe, it, expect } from 'vitest';
import { exportService } from '../services/exportService';
import { FeedSourceType } from '../types';

describe('exportService', () => {
  it('should generate valid BibTeX from a single article', () => {
    const articles = [{
      id: '1',
      title: 'Quantum Computing Breakthrough',
      authors: ['John Smith', 'Jane Doe'],
      date: '2023-05-15',
      source: FeedSourceType.NATURE,
      abstract: 'A breakthrough abstract.',
      rating: 8,
      notes: 'Good read.',
      tags: [],
      isBookmarked: false,
      noteIds: [],
      userReadTime: 0,
      shelfIds: []
    }];

    const bibtex = exportService.generateBibTeX(articles as any);
    expect(bibtex).toContain('@article{smith2023quantum');
    expect(bibtex).toContain('title = {Quantum Computing Breakthrough}');
    expect(bibtex).toContain('author = {John Smith and Jane Doe}');
    expect(bibtex).toContain('journal = {Nature}');
  });

  it('should handle multi-line abstracts and special characters in BibTeX', () => {
    const articles = [{
      id: '2',
      title: 'Testing (Special) Title!',
      authors: ['Author One'],
      date: '2024-12-01',
      source: FeedSourceType.ARXIV,
      abstract: 'Line 1\nLine 2',
      rating: 5,
      notes: '',
      tags: [],
      isBookmarked: false,
      noteIds: [],
      userReadTime: 0,
      shelfIds: []
    }];

    const bibtex = exportService.generateBibTeX(articles as any);
    expect(bibtex).toContain('@article{one2024testing');
    expect(bibtex).toContain('abstract = {Line 1 Line 2}');
  });

  it('should return an empty string for empty article list', () => {
    expect(exportService.generateBibTeX([])).toBe('');
  });
});

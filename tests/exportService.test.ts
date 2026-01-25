
import { describe, it, expect } from 'vitest';
import { exportService } from '../services/exportService';

describe('exportService', () => {
  it('should generate valid BibTeX from articles', () => {
    const articles = [{
      id: '1',
      title: 'Quantum Computing for Dummies',
      authors: ['John Smith', 'Jane Doe'],
      date: '2023-05-15',
      source: 'Nature' as any,
      abstract: 'A simple paper.',
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
    expect(bibtex).toContain('title = {Quantum Computing for Dummies}');
    expect(bibtex).toContain('author = {John Smith and Jane Doe}');
  });
});

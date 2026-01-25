
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ArticleCard from '../components/ArticleCard';
import { FeedSourceType } from '../types';

describe('ArticleCard Component', () => {
  const mockArticle = {
    id: 'a1',
    title: 'Test Article Title',
    authors: ['John Doe'],
    abstract: 'Sample Abstract',
    year: '2024',
    source: FeedSourceType.ARXIV,
    rating: 5,
    shelfIds: [],
    userReviews: { sentiment: 'Positive', citationCount: 10, summary: 'Good' },
    tags: ['AI']
  };

  const mockOnUpdate = vi.fn();
  const mockOnRead = vi.fn();
  const mockOnNavigateToNote = vi.fn();

  it('renders title and authors correctly', () => {
    render(
      <ArticleCard 
        article={mockArticle as any} 
        allNotes={[]} 
        onUpdate={mockOnUpdate} 
        onNavigateToNote={mockOnNavigateToNote} 
        onRead={mockOnRead} 
      />
    );
    expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('triggers rating update on input change', () => {
    render(
      <ArticleCard 
        article={mockArticle as any} 
        allNotes={[]} 
        onUpdate={mockOnUpdate} 
        onNavigateToNote={mockOnNavigateToNote} 
        onRead={mockOnRead} 
      />
    );
    const ratingInput = screen.getByDisplayValue('5');
    fireEvent.change(ratingInput, { target: { value: '9' } });
    expect(mockOnUpdate).toHaveBeenCalledWith('a1', { rating: 9 });
  });

  it('shows shelf menu when folder button is clicked', () => {
    render(
      <ArticleCard 
        article={mockArticle as any} 
        allNotes={[]} 
        onUpdate={mockOnUpdate} 
        onNavigateToNote={mockOnNavigateToNote} 
        onRead={mockOnRead} 
      />
    );
    const folderButton = screen.getByTitle('Manage Shelves');
    fireEvent.click(folderButton);
    expect(screen.getByText('Literature Shelves')).toBeInTheDocument();
  });

  it('triggers AI Summary extraction', async () => {
    render(
      <ArticleCard 
        article={mockArticle as any} 
        allNotes={[]} 
        onUpdate={mockOnUpdate} 
        onNavigateToNote={mockOnNavigateToNote} 
        onRead={mockOnRead} 
      />
    );
    const summaryButton = screen.getByText('⚡ AI Summary');
    fireEvent.click(summaryButton);
    expect(summaryButton).toHaveTextContent('Thinking...');
  });
});

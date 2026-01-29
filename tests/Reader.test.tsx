
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Reader from '../components/Reader';
import { FeedSourceType } from '../types';

describe('Reader Component', () => {
  const mockArticle = {
    id: 'a1',
    title: 'Research Paper X',
    authors: ['Scientist A'],
    abstract: 'Abstract content',
    year: '2024',
    source: FeedSourceType.ARXIV,
    rating: 7,
    shelfIds: [],
    pdfUrl: 'https://example.com/paper.pdf'
  };

  const mockOnUpdateNote = vi.fn();
  const mockOnCreateNote = vi.fn();
  const mockOnUpdateArticle = vi.fn();
  const mockOnAddReadTime = vi.fn();
  const mockOnAddArticle = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders article title in the header', () => {
    render(
      <Reader 
        article={mockArticle as any} 
        notes={[]} 
        onNavigateToLibrary={() => {}} 
        onUpdateNote={mockOnUpdateNote}
        onCreateNote={mockOnCreateNote}
        onUpdateArticle={mockOnUpdateArticle}
        onAddArticle={mockOnAddArticle}
        onAddReadTime={mockOnAddReadTime}
      />
    );
    expect(screen.getByText(/"Research Paper X"/)).toBeInTheDocument();
  });

  it('switches between top bar insight tabs (Quiz, Rabbit Hole, etc.)', () => {
    render(
      <Reader 
        article={mockArticle as any} 
        notes={[]} 
        onNavigateToLibrary={() => {}} 
        onUpdateNote={mockOnUpdateNote}
        onCreateNote={mockOnCreateNote}
        onUpdateArticle={mockOnUpdateArticle}
        onAddArticle={mockOnAddArticle}
        onAddReadTime={mockOnAddReadTime}
      />
    );
    
    // Expand Insights panel (default is collapsed)
    fireEvent.click(screen.getByRole('button', { name: /Show Insights Panel/i }));
    const quizTab = screen.getByRole('button', { name: /Quiz/i });
    fireEvent.click(quizTab);
    expect(screen.getByText(/Generate 10-Question Quiz/i)).toBeInTheDocument();
    
    // Expand Notes panel (default is collapsed) and verify
    fireEvent.click(screen.getByRole('button', { name: /Show Notes Panel/i }));
    expect(screen.getByText(/Annotations/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Start typing scientific insights/i)).toBeInTheDocument();
  });

  it('toggles timer visibility with correct accessibility titles', () => {
    render(
      <Reader 
        article={mockArticle as any} 
        notes={[]} 
        onNavigateToLibrary={() => {}} 
        onUpdateNote={mockOnUpdateNote}
        onCreateNote={mockOnCreateNote}
        onUpdateArticle={mockOnUpdateArticle}
        onAddArticle={mockOnAddArticle}
        onAddReadTime={mockOnAddReadTime}
      />
    );
    // Timer is hidden by default
    expect(screen.queryByText(/Session/i)).not.toBeInTheDocument();
    const showTimerButton = screen.getByTitle('Show Timer');
    fireEvent.click(showTimerButton);
    expect(screen.getByText(/Session/i)).toBeInTheDocument();
    const hideTimerButton = screen.getByTitle('Hide Timer');
    fireEvent.click(hideTimerButton);
    expect(screen.queryByText(/Session/i)).not.toBeInTheDocument();
  });

  it('toggles reading mode styling', () => {
    render(
      <Reader 
        article={mockArticle as any} 
        notes={[]} 
        onNavigateToLibrary={() => {}} 
        onUpdateNote={mockOnUpdateNote}
        onCreateNote={mockOnCreateNote}
        onUpdateArticle={mockOnUpdateArticle}
        onAddArticle={mockOnAddArticle}
        onAddReadTime={mockOnAddReadTime}
      />
    );
    
    // Use robust aria-label for selection to avoid issues with compact text content
    const nightModeButton = screen.getByRole('button', { name: /Night Mode/i });
    fireEvent.click(nightModeButton);
    const readerContainer = screen.getByTitle('Research Paper X');
    expect(readerContainer).toHaveClass('bg-[#1a1110]');
  });
});

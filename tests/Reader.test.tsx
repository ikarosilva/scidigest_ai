
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
        onAddReadTime={mockOnAddReadTime}
      />
    );
    expect(screen.getByText(/"Research Paper X"/)).toBeInTheDocument();
  });

  it('switches between sidebar tabs (Notes, Lexicon, Quiz, etc.)', () => {
    render(
      <Reader 
        article={mockArticle as any} 
        notes={[]} 
        onNavigateToLibrary={() => {}} 
        onUpdateNote={mockOnUpdateNote}
        onCreateNote={mockOnCreateNote}
        onUpdateArticle={mockOnUpdateArticle}
        onAddReadTime={mockOnAddReadTime}
      />
    );
    
    const quizTab = screen.getByText('Quiz');
    fireEvent.click(quizTab);
    expect(screen.getByText(/Generate 10-Question Quiz/i)).toBeInTheDocument();
    
    const notesTab = screen.getByText('Notes');
    fireEvent.click(notesTab);
    expect(screen.getByPlaceholderText(/Start typing your Markdown annotations/i)).toBeInTheDocument();
  });

  it('toggles timer visibility', () => {
    render(
      <Reader 
        article={mockArticle as any} 
        notes={[]} 
        onNavigateToLibrary={() => {}} 
        onUpdateNote={mockOnUpdateNote}
        onCreateNote={mockOnCreateNote}
        onUpdateArticle={mockOnUpdateArticle}
        onAddReadTime={mockOnAddReadTime}
      />
    );
    
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
        onAddReadTime={mockOnAddReadTime}
      />
    );
    
    const nightModeButton = screen.getByText('Night');
    fireEvent.click(nightModeButton);
    // Fixed: getByTitle returns the root div itself in Reader.tsx.
    const readerContainer = screen.getByTitle('Research Paper X');
    expect(readerContainer).toHaveClass('bg-[#1a1110]');
  });
});

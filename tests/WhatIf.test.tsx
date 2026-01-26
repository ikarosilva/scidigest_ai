
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import Reader from '../components/Reader';
import { FeedSourceType } from '../types';

describe('What If Feature', () => {
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

  it('allows entering a scenario and seeing implications', async () => {
    render(
      <Reader 
        article={mockArticle as any} 
        notes={[]} 
        onNavigateToLibrary={() => {}} 
        onUpdateNote={() => {}}
        onCreateNote={() => {}}
        onUpdateArticle={() => {}}
        onAddArticle={() => {}}
        onAddReadTime={() => {}}
      />
    );
    
    // Switch to What If tab
    const whatIfTab = screen.getByRole('button', { name: /What If/i });
    fireEvent.click(whatIfTab);
    
    // Check initial state within tab content
    expect(await screen.findByText(/What If Assistant/i)).toBeInTheDocument();
    
    // Enter scenario
    const input = screen.getByPlaceholderText(/What if this was applied/i);
    fireEvent.change(input, { target: { value: 'What if we used a different dataset?' } });
    
    // Trigger analysis
    const analyzeButton = screen.getByRole('button', { name: /Analyze Scenario/i });
    fireEvent.click(analyzeButton);
    
    // Wait for result (mocked in setup.ts)
    await waitFor(() => {
      expect(screen.queryByText(/Hypothetical analysis failed/i)).not.toBeInTheDocument();
    });
  });
});

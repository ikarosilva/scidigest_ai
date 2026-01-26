
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Reader from '../components/Reader';
import { FeedSourceType } from '../types';

describe('Rabbit Hole Feature', () => {
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

  const mockOnAddArticle = vi.fn();

  it('allows switching to Rabbit Hole tab and discovering citations', async () => {
    render(
      <Reader 
        article={mockArticle as any} 
        notes={[]} 
        onNavigateToLibrary={() => {}} 
        onUpdateNote={() => {}}
        onCreateNote={() => {}}
        onUpdateArticle={() => {}}
        onAddArticle={mockOnAddArticle}
        onAddReadTime={() => {}}
      />
    );
    
    const rabbitTab = screen.getByRole('button', { name: /Rabbit Hole/i });
    fireEvent.click(rabbitTab);
    
    // Content header for Rabbit Hole
    expect(await screen.findByText(/Rabbit Hole Discovery/i)).toBeInTheDocument();
    
    const discoverButton = screen.getByRole('button', { name: /Discover Forward Citations/i });
    fireEvent.click(discoverButton);
    
    // Check if results appear (mocked in setup.ts)
    await waitFor(() => {
      expect(screen.getByText('Grounding Source')).toBeInTheDocument();
    });
  });

  it('allows adding a discovered citation to the queue', async () => {
    render(
      <Reader 
        article={mockArticle as any} 
        notes={[]} 
        onNavigateToLibrary={() => {}} 
        onUpdateNote={() => {}}
        onCreateNote={() => {}}
        onUpdateArticle={() => {}}
        onAddArticle={mockOnAddArticle}
        onAddReadTime={() => {}}
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /Rabbit Hole/i }));
    const discoverButton = await screen.findByRole('button', { name: /Discover Forward Citations/i });
    fireEvent.click(discoverButton);
    
    await waitFor(() => {
      const queueButton = screen.getByRole('button', { name: /\+ Ingest/i });
      fireEvent.click(queueButton);
    });
    
    expect(mockOnAddArticle).toHaveBeenCalled();
  });
});

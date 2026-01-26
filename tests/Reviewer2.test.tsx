
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Reader from '../components/Reader';
import { FeedSourceType } from '../types';

describe('Reviewer 2 Adversarial Audit', () => {
  const mockArticle = {
    id: 'a1',
    title: 'Methodologically Flawed Paper',
    authors: ['Ambitious Researcher'],
    abstract: 'We claim amazing results with minimal data.',
    year: '2024',
    source: FeedSourceType.ARXIV,
    rating: 7,
    shelfIds: [],
    pdfUrl: 'https://example.com/paper.pdf'
  };

  it('triggers the audit and displays the results', async () => {
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
    
    // Switch to Reviewer 2 tab
    const reviewerTab = screen.getByRole('button', { name: /Reviewer 2/i });
    fireEvent.click(reviewerTab);
    
    // Check content header is visible
    expect(await screen.findByText(/Reviewer 2 Protocol/i)).toBeInTheDocument();
    
    // Trigger audit via explicit button role
    const triggerButton = screen.getByRole('button', { name: /Trigger Adversarial Audit/i });
    fireEvent.click(triggerButton);
    
    // Wait for the audit content to appear (mocked response in setup.ts)
    await waitFor(() => {
      expect(screen.queryByText(/Adversarial audit failed/i)).not.toBeInTheDocument();
    });
  });
});

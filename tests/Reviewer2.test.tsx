
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
    const reviewerTab = screen.getByText('Reviewer 2');
    fireEvent.click(reviewerTab);
    
    // Check initial state
    expect(screen.getByText(/Reviewer 2 Protocol/i)).toBeInTheDocument();
    
    // Trigger audit
    const triggerButton = screen.getByText(/Trigger Adversarial Audit/i);
    fireEvent.click(triggerButton);
    
    // Wait for the audit content to appear (mocked response in setup.ts includes 'abstract' or 'term' keyword which triggers mock JSON)
    // NOTE: In setup.ts, the mock response returns a predefined term object if 'abstract' is in the prompt.
    // The component renders text directly if it's a string, or formatted if it's the mock.
    await waitFor(() => {
      expect(screen.getByText(/Adversarial audit failed/i)).not.toBeInTheDocument();
      // Since mock returns a JSON string, it will show up as raw text or structured text depending on how text is returned.
      // Based on Reader.tsx, we display {auditResult}.
    });
  });
});

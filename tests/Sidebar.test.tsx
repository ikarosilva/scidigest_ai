import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../components/Sidebar';

describe('Sidebar Component', () => {
  const mockSetTab = vi.fn();
  const mockOpenFeedback = vi.fn();

  it('renders research group headers and main logo', () => {
    render(
      <Sidebar 
        currentTab="feed" 
        setTab={mockSetTab} 
        onOpenFeedback={mockOpenFeedback} 
        syncStatus="synced" 
      />
    );
    
    expect(screen.getByText('SciDigest')).toBeInTheDocument();
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    // Using getAllByText because "Insights" appears as both a group label and a dashboard tab label
    expect(screen.getAllByText('Insights').length).toBeGreaterThan(0);
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('highlights the current active tab', () => {
    render(
      <Sidebar 
        currentTab="library" 
        setTab={mockSetTab} 
        onOpenFeedback={mockOpenFeedback} 
        syncStatus="synced" 
      />
    );
    
    const libraryButton = screen.getByText('Library').closest('button');
    expect(libraryButton).toHaveClass('bg-indigo-500/10');
  });

  it('calls setTab when a navigation item is clicked', () => {
    render(
      <Sidebar 
        currentTab="feed" 
        setTab={mockSetTab} 
        onOpenFeedback={mockOpenFeedback} 
        syncStatus="synced" 
      />
    );
    
    const notesButton = screen.getByText('Notes');
    fireEvent.click(notesButton);
    expect(mockSetTab).toHaveBeenCalledWith('notes');
  });

  it('triggers feedback modal when Submit Issues is clicked', () => {
    render(
      <Sidebar 
        currentTab="feed" 
        setTab={mockSetTab} 
        onOpenFeedback={mockOpenFeedback} 
        syncStatus="synced" 
      />
    );
    
    const feedbackButton = screen.getByText('Submit Issues');
    fireEvent.click(feedbackButton);
    expect(mockOpenFeedback).toHaveBeenCalled();
  });
});
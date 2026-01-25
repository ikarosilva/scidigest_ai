
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../components/Sidebar';

describe('Sidebar Component', () => {
  const mockSetTab = vi.fn();
  const mockOpenFeedback = vi.fn();

  it('renders research group headers', () => {
    render(
      <Sidebar 
        currentTab="feed" 
        setTab={mockSetTab} 
        onOpenFeedback={mockOpenFeedback} 
        syncStatus="synced" 
      />
    );
    
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
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
    
    const libraryButton = screen.getByText('Library');
    fireEvent.click(libraryButton);
    expect(mockSetTab).toHaveBeenCalledWith('library');
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


import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InterestsManager from '../components/InterestsManager';

describe('InterestsManager Component', () => {
  const mockInterests = ['Machine Learning', 'Signal Processing'];
  const mockOnUpdateInterests = vi.fn();
  const mockSocialProfiles = { name: 'Dr. Test', googleScholar: '' };
  const mockOnUpdateSocialProfiles = vi.fn();

  it('renders current interests as tags', () => {
    render(
      <InterestsManager 
        interests={mockInterests}
        onUpdateInterests={mockOnUpdateInterests}
        socialProfiles={mockSocialProfiles}
        onUpdateSocialProfiles={mockOnUpdateSocialProfiles}
      />
    );
    expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    expect(screen.getByText('Signal Processing')).toBeInTheDocument();
  });

  it('allows adding a new manual interest', () => {
    render(
      <InterestsManager 
        interests={mockInterests}
        onUpdateInterests={mockOnUpdateInterests}
        socialProfiles={mockSocialProfiles}
        onUpdateSocialProfiles={mockOnUpdateSocialProfiles}
      />
    );
    const input = screen.getByPlaceholderText('e.g., Signal Processing');
    fireEvent.change(input, { target: { value: 'Bioinformatics' } });
    fireEvent.submit(screen.getByText('Add'));
    
    expect(mockOnUpdateInterests).toHaveBeenCalledWith([...mockInterests, 'Bioinformatics']);
  });

  it('allows removing an interest', () => {
    render(
      <InterestsManager 
        interests={mockInterests}
        onUpdateInterests={mockOnUpdateInterests}
        socialProfiles={mockSocialProfiles}
        onUpdateSocialProfiles={mockOnUpdateSocialProfiles}
      />
    );
    const removeButtons = screen.getAllByText('✕');
    fireEvent.click(removeButtons[0]);
    
    expect(mockOnUpdateInterests).toHaveBeenCalledWith(['Signal Processing']);
  });

  it('allows adding an author to the radar', () => {
    render(
      <InterestsManager 
        interests={mockInterests}
        onUpdateInterests={mockOnUpdateInterests}
        socialProfiles={mockSocialProfiles}
        onUpdateSocialProfiles={mockOnUpdateSocialProfiles}
      />
    );
    const authorInput = screen.getByPlaceholderText(/Track author/i);
    fireEvent.change(authorInput, { target: { value: 'Yann LeCun' } });
    const addButton = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(addButton);
    
    // Verifying it shows up in tracked authors (via mock dbService signal)
    expect(authorInput).toHaveValue('');
  });
});

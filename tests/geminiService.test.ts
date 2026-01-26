
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geminiService } from '../services/geminiService';
import { GoogleGenAI } from '@google/genai';
import { FeedSourceType } from '../types';

describe('geminiService', () => {
  it('should generate a QuickTake summary', async () => {
    const quickTake = await geminiService.generateQuickTake('Title', 'Abstract');
    expect(quickTake).toBeDefined();
    expect(typeof quickTake).toBe('string');
  });

  it('should extract metadata from PDF base64', async () => {
    const metadata = await geminiService.extractMetadataFromPDF('base64data');
    expect(metadata).toHaveProperty('title');
    expect(metadata).toHaveProperty('abstract');
  });

  it('should rank article candidates', async () => {
    const candidates = [
      { id: '1', title: 'Paper 1', snippet: 'A' },
      { id: '2', title: 'Paper 2', snippet: 'B' }
    ];
    // Fix: Added missing debugMode to AIConfig to satisfy type requirements
    const aiConfig = { recommendationBias: 'balanced' as const, reviewer2Prompt: '', feedbackUrl: '', monthlyTokenLimit: 1000000, debugMode: false };
    
    // Fix: Added missing 4th argument (interests array) to match the signature of recommendArticles
    const rankings = await geminiService.recommendArticles([], [], candidates, [], aiConfig);
    expect(Array.isArray(rankings)).toBe(true);
  });

  it('should define a scientific term in context', async () => {
    const result = await geminiService.defineScientificTerm('Neural Networks', 'AI Evolution');
    expect(result).toBeDefined();
    // Assuming the mock returns a JSON object
    expect(result).toHaveProperty('term');
  });

  it('should retrieve trending research results', async () => {
    const trending = await geminiService.getTrendingResearch(['Physics'], '1 week');
    expect(trending).toHaveProperty('results');
    expect(trending).toHaveProperty('groundingSources');
  });
});


import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Article, Book, UserReviews, Sentiment, FeedSourceType, AIConfig, SocialProfiles, Feed, GeminiUsageEvent } from "../types";
import { dbService } from "./dbService";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Tracks API usage internally.
 */
const reportUsage = (feature: string, model: string, response: any, startTime: number, success: boolean) => {
  const endTime = Date.now();
  const usage = response?.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };
  
  const event: GeminiUsageEvent = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    feature,
    model,
    promptTokens: usage.promptTokenCount || 0,
    candidatesTokens: usage.candidatesTokenCount || 0,
    totalTokens: usage.totalTokenCount || 0,
    latencyMs: endTime - startTime,
    success
  };
  
  dbService.trackUsage(event);
};

const extractJson = (text: string | undefined, fallback: any = {}) => {
  if (!text) return fallback;
  try {
    let cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = cleanedText.indexOf('{');
    const firstBracket = cleanedText.indexOf('[');
    let startIdx = -1;
    let endChar = '';
    
    if (firstBrace !== -1 && (firstBracket === -1 || (firstBrace < firstBracket && firstBrace !== -1))) {
      startIdx = firstBrace;
      endChar = '}';
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endChar = ']';
    }
    
    if (startIdx !== -1) {
      const lastIdx = cleanedText.lastIndexOf(endChar);
      if (lastIdx !== -1) {
        cleanedText = cleanedText.substring(startIdx, lastIdx + 1);
      }
    }
    return JSON.parse(cleanedText);
  } catch (e) {
    return fallback;
  }
};

export const geminiService = {
  async extractMetadataFromPDF(base64PDF: string): Promise<any> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-pro-preview';
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64PDF } },
            { text: "Analyze this scientific paper and extract: Title, Authors (array of strings), Abstract, Year of publication, and 5 technical tags. Return strictly as a JSON object with keys: title, authors, abstract, year, tags." },
          ],
        },
        config: { responseMimeType: "application/json" }
      });
      reportUsage("PDF Metadata Extraction", modelName, response, start, true);
      return extractJson(response.text, {});
    } catch (error: any) {
      reportUsage("PDF Metadata Extraction", modelName, null, start, false);
      dbService.addLog('error', `PDF Metadata Extraction Failed: ${error?.message || String(error)}`);
      return null;
    }
  },

  async suggestTagsAndTopics(title: string, abstract: string, existingInterests: string[]): Promise<{ tags: string[], newTopics: string[] }> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `
      Paper: ${title}
      Abstract: ${abstract}
      Existing User Interests: ${existingInterests.join(', ')}
      Analyze the paper. Provide: 1. A list of 5 technical tags. 2. Identify which of these tags represent a significant new research direction. Return JSON: { "tags": [], "newTopics": [] }
    `;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      reportUsage("Tag Suggestion", modelName, response, start, true);
      return extractJson(response.text, { tags: [], newTopics: [] });
    } catch (error: any) {
      reportUsage("Tag Suggestion", modelName, null, start, false);
      return { tags: [], newTopics: [] };
    }
  },

  async generateQuickTake(title: string, abstract: string): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Provide exactly one sentence explaining the core technical contribution: \nTitle: ${title}\nAbstract: ${abstract}`,
        config: { temperature: 0.3 }
      });
      reportUsage("QuickTake Generation", modelName, response, start, true);
      return response.text || "";
    } catch (error) {
      reportUsage("QuickTake Generation", modelName, null, start, false);
      return "";
    }
  },

  async generatePodcastScript(articles: Article[]): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const context = articles.map(a => `Title: ${a.title}\nAbstract: ${a.abstract}`).join('\n\n');
    const prompt = `Create a conversational podcast script for Joe and Jane reviewing these papers:\n${context}`;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      reportUsage("Podcast Script", modelName, response, start, true);
      return response.text || "";
    } catch (error: any) {
      reportUsage("Podcast Script", modelName, null, start, false);
      return "";
    }
  },

  async generatePodcastAudio(script: string): Promise<string | null> {
    const ai = getAI();
    const start = Date.now();
    const modelName = "gemini-2.5-flash-preview-tts";
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text: `TTS conversation:\n${script}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                { speaker: 'Joe', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                { speaker: 'Jane', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
              ]
            }
          }
        }
      });
      reportUsage("Podcast TTS", modelName, response, start, true);
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error: any) {
      reportUsage("Podcast TTS", modelName, null, start, false);
      return null;
    }
  },

  async whatIfAssistant(message: string, history: any[], article: Article): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const systemInstruction = `Research colleague discussing "${article.title}". Abstract: ${article.abstract}`;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [...history, { role: 'user', parts: [{ text: message }] }],
        config: { systemInstruction, temperature: 0.8 }
      });
      reportUsage("WhatIf Assistant", modelName, response, start, true);
      return response.text || "";
    } catch (error: any) {
      reportUsage("WhatIf Assistant", modelName, null, start, false);
      return "I'm having trouble processing that hypothesis.";
    }
  },

  async synthesizeResearch(articles: Article[], notes: string[]): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-pro-preview';
    const context = articles.map(a => `PAPER: ${a.title}\nABSTRACT: ${a.abstract}`).join('\n\n');
    const prompt = `Synthesize these research papers into a scientific report.\n${context}\n${notes.join('\n')}`;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      reportUsage("Research Synthesis", modelName, response, start, true);
      return response.text || "";
    } catch (error: any) {
      reportUsage("Research Synthesis", modelName, null, start, false);
      return "An error occurred during multi-document synthesis.";
    }
  },

  async fetchScholarArticles(profiles: SocialProfiles): Promise<Partial<Article>[]> {
    const targetIdentity = profiles.googleScholar || profiles.name;
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Use googleSearch to retrieve publications for: "${targetIdentity}". Return JSON array.`;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      reportUsage("Scholar Discovery", modelName, response, start, true);
      return extractJson(response.text, []);
    } catch (error: any) {
      reportUsage("Scholar Discovery", modelName, null, start, false);
      throw error;
    }
  },

  async summarizeArticle(title: string, abstract: string): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Summarize in 3 bullets: \nTitle: ${title}\nAbstract: ${abstract}`,
      });
      reportUsage("Quick Summary", modelName, response, start, true);
      return response.text || "";
    } catch (error: any) {
      reportUsage("Quick Summary", modelName, null, start, false);
      return "Summary unavailable.";
    }
  },

  async recommendArticles(ratedArticles: Article[], books: Book[], candidates: any[], aiConfig: AIConfig): Promise<number[]> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Rank these based on interests: ${candidates.map((c, i) => `[${i}] ${c.title}`).join('\n')}`;
    
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      reportUsage("AI Recommendation", modelName, response, start, true);
      return extractJson(response.text, candidates.map((_, i) => i));
    } catch (error: any) {
      reportUsage("AI Recommendation", modelName, null, start, false);
      return candidates.map((_, i) => i);
    }
  },

  async discoverInterestsFromProfiles(profiles: SocialProfiles): Promise<string[]> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Analyze profiles for research trajectories: ${JSON.stringify(profiles)}. Return JSON array string.`;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      reportUsage("Interest Discovery", modelName, response, start, true);
      return extractJson(response.text, []);
    } catch (error: any) {
      reportUsage("Interest Discovery", modelName, null, start, false);
      return [];
    }
  },

  async getTrendingResearch(topics: string[], timeScale: string): Promise<any> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Find top 6 trending papers on: ${topics.join(', ')}. Return JSON.`;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      const data = extractJson(response.text, { results: [] });
      reportUsage("Trending Sweep", modelName, response, start, true);
      return { results: data.results || [], groundingSources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
    } catch (error: any) {
      reportUsage("Trending Sweep", modelName, null, start, false);
      return { results: [], groundingSources: [] };
    }
  },

  async searchAmazonBooks(topics: string[]): Promise<any> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Search highest rated books for: ${topics.join(', ')}. Return JSON.`;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      const data = extractJson(response.text, { results: [] });
      reportUsage("Amazon Search", modelName, response, start, true);
      return { results: data.results || [], groundingSources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
    } catch (error: any) {
      reportUsage("Amazon Search", modelName, null, start, false);
      return { results: [], groundingSources: [] };
    }
  },

  async discoverAuthorNetwork(profiles: SocialProfiles): Promise<any> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const identity = profiles.googleScholar || profiles.name;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Discover co-author network for: "${identity}". Return JSON graph nodes/links.`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
      });
      reportUsage("Network Mapping", modelName, response, start, true);
      return extractJson(response.text, { nodes: [], links: [], clusters: [] });
    } catch (error: any) {
      reportUsage("Network Mapping", modelName, null, start, false);
      return { nodes: [], links: [], clusters: [] };
    }
  },

  async discoverReferences(article: Article): Promise<{ references: string[], groundingSources: any[] }> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Find papers citing or cited by: "${article.title}". Return JSON references array.`,
        config: { tools: [{ googleSearch: {} }] }
      });
      reportUsage("Reference Discovery", modelName, response, start, true);
      const data = extractJson(response.text, { references: [] });
      return { references: data.references || [], groundingSources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
    } catch (error: any) {
      reportUsage("Reference Discovery", modelName, null, start, false);
      return { references: [], groundingSources: [] };
    }
  },

  async defineScientificTerm(term: string, paperTitle: string): Promise<any> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Define "${term}" in context of "${paperTitle}". Return JSON object.`,
        config: { responseMimeType: "application/json" }
      });
      reportUsage("Lexicon Lookup", modelName, response, start, true);
      return extractJson(response.text, null);
    } catch (error: any) {
      reportUsage("Lexicon Lookup", modelName, null, start, false);
      return null;
    }
  },

  async fetchArticleDetails(query: string): Promise<any> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Find academic metadata for: "${query}". Return JSON.`,
        config: { tools: [{ googleSearch: {} }] }
      });
      reportUsage("Citation Hydration", modelName, response, start, true);
      return extractJson(response.text, null);
    } catch (error: any) {
      reportUsage("Citation Hydration", modelName, null, start, false);
      return null;
    }
  },

  async reviewAsReviewer2(title: string, abstract: string, reviewerPrompt: string): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-pro-preview';
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `${reviewerPrompt}\n\nTitle: ${title}\nAbstract: ${abstract}`,
      });
      reportUsage("Reviewer 2 Protocol", modelName, response, start, true);
      return response.text || "";
    } catch (error: any) {
      reportUsage("Reviewer 2 Protocol", modelName, null, start, false);
      return "Critical review unavailable.";
    }
  },

  async generateQuiz(title: string, abstract: string): Promise<any[]> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Create 10-question quiz for: ${title}. Return JSON.`,
        config: { responseMimeType: "application/json" }
      });
      reportUsage("Quiz Generation", modelName, response, start, true);
      return extractJson(response.text, []);
    } catch (error: any) {
      reportUsage("Quiz Generation", modelName, null, start, false);
      return [];
    }
  },

  async discoverScientificFeeds(interests: string[]): Promise<any[]> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Discover 10 technical feeds for: ${interests.join(', ')}. Return JSON.`,
        config: { tools: [{ googleSearch: {} }] }
      });
      reportUsage("Feed Discovery", modelName, response, start, true);
      return extractJson(response.text, []);
    } catch (error: any) {
      reportUsage("Feed Discovery", modelName, null, start, false);
      return [];
    }
  },

  async getRadarUpdates(papers: string[], authors: string[]): Promise<any[]> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Sweep for updates: [${papers.join(', ')}] and [${authors.join(', ')}]. Return JSON.`,
        config: { tools: [{ googleSearch: {} }] }
      });
      reportUsage("Sonar Sweep", modelName, response, start, true);
      return extractJson(response.text, []);
    } catch (error: any) {
      reportUsage("Sonar Sweep", modelName, null, start, false);
      return [];
    }
  }
};

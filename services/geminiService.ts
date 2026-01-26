
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { Article, UserReviews, Sentiment, FeedSourceType, AIConfig, SocialProfiles, Feed, GeminiUsageEvent } from "../types";
import { dbService } from "./dbService";
import { SYSTEM_INSTRUCTIONS, PROMPTS } from "./prompts";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
    if (isRateLimit && retries > 0) {
      dbService.addLog('warning', `Rate limit hit. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const reportUsage = (feature: string, model: string, response: GenerateContentResponse | null, startTime: number, success: boolean, context?: any) => {
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

  const config = dbService.getAIConfig();
  if (config.debugMode) {
    dbService.addLog(success ? 'debug' : 'error', `[GEMINI] ${feature} ${success ? 'Completed' : 'Failed'}`, {
      latency: endTime - startTime,
      usage: usage,
      model: model,
      ...context
    });
  }
};

export const geminiService = {
  // Ranks article candidates and identifies matching topics based on user research trajectory
  async recommendArticles(ratedArticles: Article[], books: any[], candidates: any[], interests: string[], aiConfig: AIConfig): Promise<{ index: number, matchedTopics: string[] }[]> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const context = `Rated Papers: ${ratedArticles.map(a => `${a.title} (Rating: ${a.rating}/10)`).join(', ')}\n` +
                    `Rated Books: ${books.map(b => `${b.title} (Rating: ${b.rating}/5)`).join(', ')}\n` +
                    `User Research Interests: ${interests.join(', ')}`;
    
    const prompt = `Based on the following library, interests, and the recommendation bias "${aiConfig.recommendationBias}", rank these new candidates by relevance to the user's research trajectory. 
    For each candidate, specifically identify which of the provided interests (if any) it aligns with. 
    Return an array of objects containing the "index" and "matchedTopics".\n\nCANDIDATES:\n${candidates.map((c, i) => `${i}: ${c.title} - ${c.snippet}`).join('\n')}\n\nCONTEXT:\n${context}`;

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                index: { type: Type.INTEGER },
                matchedTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["index", "matchedTopics"]
            }
          }
        }
      }));
      const results = JSON.parse(response.text || "[]");
      reportUsage("Article Recommendation", modelName, response, start, true);
      return results;
    } catch (error: any) {
      reportUsage("Article Recommendation", modelName, null, start, false, { error: error.message });
      return candidates.map((_, i) => ({ index: i, matchedTopics: [] }));
    }
  },

  // Discovers granular research interests from social and academic profiles using gemini-3-flash-preview
  async discoverInterestsFromProfiles(profiles: SocialProfiles): Promise<string[]> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Analyze these academic profiles and suggest a list of granular research trajectories (interests) for this researcher.\nName: ${profiles.name}\nMedium: ${profiles.medium}\nLinkedIn: ${profiles.linkedin}\nScholar: ${profiles.googleScholar}\nUse Web Search: ${profiles.usePublicWebSearch}`;
    
    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: profiles.usePublicWebSearch ? [{ googleSearch: {} }] : undefined,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }));
      const interests = JSON.parse(response.text || "[]");
      reportUsage("Interest Discovery", modelName, response, start, true);
      return interests;
    } catch (error: any) {
      reportUsage("Interest Discovery", modelName, null, start, false, { error: error.message });
      return [];
    }
  },

  // Searches Amazon for technical books based on research topics using gemini-3-flash-preview and googleSearch
  async searchAmazonBooks(topics: string[]): Promise<{ results: any[], groundingSources: any[] }> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Search for the highest rated and most relevant technical books and monographs on Amazon for these topics: ${topics.join(', ')}. Return details including title, author, price, rating, amazonUrl, and description.`;
    
    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              books: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    author: { type: Type.STRING },
                    price: { type: Type.STRING },
                    rating: { type: Type.NUMBER },
                    amazonUrl: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["title", "author", "amazonUrl"]
                }
              }
            },
            required: ["books"]
          }
        }
      }));
      const data = JSON.parse(response.text || '{"books":[]}');
      reportUsage("Amazon Book Search", modelName, response, start, true);
      return {
        results: data.books || [],
        groundingSources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      };
    } catch (error: any) {
      reportUsage("Amazon Book Search", modelName, null, start, false, { error: error.message });
      return { results: [], groundingSources: [] };
    }
  },

  // Discovers co-author networks and research clusters using gemini-3-pro-preview and googleSearch
  async discoverAuthorNetwork(profiles: SocialProfiles): Promise<any> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-pro-preview';
    const prompt = `Discover the co-author network and research clusters for the researcher: ${profiles.name} (${profiles.googleScholar}). Identify key collaborators, shared papers, and thematic clusters.`;
    
    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    level: { type: Type.INTEGER },
                    cluster: { type: Type.STRING }
                  },
                  required: ["id", "name", "level", "cluster"]
                }
              },
              links: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    source: { type: Type.STRING },
                    target: { type: Type.STRING }
                  },
                  required: ["source", "target"]
                }
              },
              clusters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    color: { type: Type.STRING }
                  },
                  required: ["name", "color"]
                }
              }
            },
            required: ["nodes", "links", "clusters"]
          }
        }
      }));
      const data = JSON.parse(response.text || '{"nodes":[],"links":[],"clusters":[]}');
      reportUsage("Author Network Discovery", modelName, response, start, true);
      return data;
    } catch (error: any) {
      reportUsage("Author Network Discovery", modelName, null, start, false, { error: error.message });
      return null;
    }
  },

  // Interactive scientific colleague chat using gemini-3-flash-preview
  async whatIfAssistant(userInput: string, history: any[], article: Article): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const context = `CONTEXT PAPER: ${article.title}\nABSTRACT: ${article.abstract}`;
    
    const contents = history.map(m => ({ role: m.role, parts: m.parts }));
    contents.push({ role: 'user', parts: [{ text: `${context}\n\nUSER QUESTION: ${userInput}` }] });

    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: { systemInstruction: "You are a scientific colleague exploring hypothetical scenarios and alternative methodologies based on research papers. Provide technically grounded, speculative but logical responses." }
      }));
      reportUsage("What If Analysis", modelName, response, start, true);
      return response.text || "";
    } catch (error: any) {
      reportUsage("What If Analysis", modelName, null, start, false, { error: error.message });
      return "The analytical engine encountered an error exploring this hypothesis.";
    }
  },

  // Fetches detailed academic metadata for a given identifier or URL using gemini-3-flash-preview and googleSearch
  async fetchArticleDetails(identifier: string): Promise<Partial<Article> | null> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    
    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: `Fetch academic metadata for: "${identifier}"`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              authors: { type: Type.ARRAY, items: { type: Type.STRING } },
              abstract: { type: Type.STRING },
              year: { type: Type.STRING },
              pdfUrl: { type: Type.STRING },
              citationCount: { type: Type.INTEGER },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title"]
          }
        }
      }));
      const data = JSON.parse(response.text || "{}");
      reportUsage("Article Detail Fetch", modelName, response, start, true);
      return data;
    } catch (error: any) {
      reportUsage("Article Detail Fetch", modelName, null, start, false, { error: error.message });
      return null;
    }
  },

  // Discovers high-quality scientific feeds based on research interests using gemini-3-flash-preview and googleSearch
  async discoverScientificFeeds(interests: string[]): Promise<any[]> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Identify high-quality RSS or JSON feeds from major journals, preprint servers, and technical blogs for these research interests: ${interests.join(', ')}. Return name, url, type, and description.`;
    
    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                url: { type: Type.STRING },
                type: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["name", "url", "type"]
            }
          }
        }
      }));
      const feeds = JSON.parse(response.text || "[]");
      reportUsage("Feed Discovery", modelName, response, start, true);
      return feeds;
    } catch (error: any) {
      reportUsage("Feed Discovery", modelName, null, start, false, { error: error.message });
      return [];
    }
  },

  // Generates a technical podcast script for multiple speakers using gemini-3-flash-preview
  async generatePodcastScript(articles: Article[]): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Create a technical conversation script between Joe and Jane about these papers:\n${articles.map(a => `TITLE: ${a.title}\nABSTRACT: ${a.abstract}`).join('\n\n')}\n\nFormat as:\nJoe: [dialogue]\nJane: [dialogue]`;
    
    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { systemInstruction: "You are a scriptwriter for a high-level scientific podcast." }
      }));
      reportUsage("Podcast Script Generation", modelName, response, start, true);
      return response.text || "";
    } catch (error: any) {
      reportUsage("Podcast Script Generation", modelName, null, start, false, { error: error.message });
      return "";
    }
  },

  // Generates multi-speaker audio for a podcast script using gemini-2.5-flash-preview-tts
  async generatePodcastAudio(script: string): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-2.5-flash-preview-tts';
    
    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text: `TTS the following conversation between Joe and Jane:\n${script}` }] }],
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
      }));
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
      reportUsage("Podcast Audio Generation", modelName, response, start, true);
      return base64Audio;
    } catch (error: any) {
      reportUsage("Podcast Audio Generation", modelName, null, start, false, { error: error.message });
      return "";
    }
  },

  // Scans for recent publications or citations on tracked papers and authors using gemini-3-flash-preview and googleSearch
  async getRadarUpdates(trackedPapers: string[], trackedAuthors: string[]): Promise<any[]> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Search for the most recent (2024-2025) publications by these authors: ${trackedAuthors.join(', ')} OR papers that cite these works: ${trackedPapers.join(', ')}. Return details including title, authors, abstract, year, source, and the reason for the hit.`;
    
    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                authors: { type: Type.ARRAY, items: { type: Type.STRING } },
                abstract: { type: Type.STRING },
                year: { type: Type.STRING },
                source: { type: Type.STRING },
                url: { type: Type.STRING },
                reason: { type: Type.STRING },
                citationCount: { type: Type.INTEGER }
              },
              required: ["title", "reason"]
            }
          }
        }
      }));
      const hits = JSON.parse(response.text || "[]");
      reportUsage("Radar Scan", modelName, response, start, true);
      return hits;
    } catch (error: any) {
      reportUsage("Radar Scan", modelName, null, start, false, { error: error.message });
      return [];
    }
  },

  // General trending research scan based on topics and timeframe using gemini-3-flash-preview and googleSearch
  async getTrendingResearch(topics: string[], timeScale: string): Promise<{ results: any[], groundingSources: any[] }> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Identify highly trending papers or technical findings from the last ${timeScale} related to these research topics: ${topics.join(', ')}. Return title, authors, year, citationCount, snippet, source, and scholarUrl.`;
    
    try {
      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    authors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    year: { type: Type.STRING },
                    citationCount: { type: Type.INTEGER },
                    snippet: { type: Type.STRING },
                    source: { type: Type.STRING },
                    scholarUrl: { type: Type.STRING }
                  },
                  required: ["title", "scholarUrl"]
                }
              }
            },
            required: ["results"]
          }
        }
      }));
      const data = JSON.parse(response.text || '{"results":[]}');
      reportUsage("Trending Research Scan", modelName, response, start, true);
      return {
        results: data.results || [],
        groundingSources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      };
    } catch (error: any) {
      reportUsage("Trending Research Scan", modelName, null, start, false, { error: error.message });
      return { results: [], groundingSources: [] };
    }
  },

  async extractMetadataFromPDF(base64PDF: string): Promise<any> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview'; 
    try {
      const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64PDF } },
            { text: SYSTEM_INSTRUCTIONS.METADATA_EXTRACTOR },
          ],
        },
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              authors: { type: Type.ARRAY, items: { type: Type.STRING } },
              abstract: { type: Type.STRING },
              year: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "authors", "abstract", "year", "tags"]
          }
        }
      }));
      
      const data = JSON.parse(response.text || "{}");
      reportUsage("PDF Metadata Extraction", modelName, response, start, true);
      return data;
    } catch (error: any) {
      reportUsage("PDF Metadata Extraction", modelName, null, start, false, { error: error.message });
      dbService.addLog('error', `PDF Metadata Extraction Failed: ${error?.message || String(error)}`);
      return null;
    }
  },

  async suggestTagsAndTopics(title: string, abstract: string, existingInterests: string[]): Promise<{ tags: string[], newTopics: string[] }> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    try {
      const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: PROMPTS.SUGGEST_TAGS(title, abstract, existingInterests),
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              newTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["tags", "newTopics"]
          }
        }
      }));
      const data = JSON.parse(response.text || '{"tags":[],"newTopics":[]}');
      reportUsage("Tag Suggestion", modelName, response, start, true);
      return data;
    } catch (error: any) {
      reportUsage("Tag Suggestion", modelName, null, start, false, { error: error.message });
      return { tags: [], newTopics: [] };
    }
  },

  async generateQuickTake(title: string, abstract: string): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    try {
      const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: `${SYSTEM_INSTRUCTIONS.QUICK_TAKE}\nTitle: ${title}\nAbstract: ${abstract}`,
        config: { temperature: 0.1 } // Low temperature for deterministic output
      }));
      reportUsage("QuickTake Generation", modelName, response, start, true);
      return response.text?.trim() || "";
    } catch (error: any) {
      reportUsage("QuickTake Generation", modelName, null, start, false, { error: error.message });
      return "";
    }
  },

  async synthesizeResearch(articles: Article[], notes: string[]): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-pro-preview';
    const context = articles.map(a => `PAPER: ${a.title}\nABSTRACT: ${a.abstract}`).join('\n\n');
    const prompt = `Synthesize these research papers into a scientific report. Identify thematic intersections, methodological conflicts, and future research vectors. Include synthesis of user notes: ${notes.join('\n')}\n\nRESOURCES:\n${context}`;
    try {
      const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { systemInstruction: SYSTEM_INSTRUCTIONS.RESEARCH_ASSISTANT }
      }));
      reportUsage("Research Synthesis", modelName, response, start, true);
      return response.text || "";
    } catch (error: any) {
      reportUsage("Research Synthesis", modelName, null, start, false, { error: error.message });
      return "An error occurred during multi-document synthesis.";
    }
  },

  async discoverReferences(article: Article): Promise<{ references: string[], groundingSources: any[] }> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    try {
      const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: PROMPTS.CITATION_SEARCH(article.title),
        config: { 
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              references: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["references"]
          }
        }
      }));
      const data = JSON.parse(response.text || '{"references":[]}');
      reportUsage("Reference Discovery", modelName, response, start, true);
      return { 
        references: data.references || [], 
        groundingSources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] 
      };
    } catch (error: any) {
      reportUsage("Reference Discovery", modelName, null, start, false, { error: error.message });
      return { references: [], groundingSources: [] };
    }
  },

  async summarizeArticle(title: string, abstract: string): Promise<string> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    try {
      const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: `Summarize in 3 technical bullets: \nTitle: ${title}\nAbstract: ${abstract}`,
        config: { systemInstruction: SYSTEM_INSTRUCTIONS.RESEARCH_ASSISTANT }
      }));
      reportUsage("Quick Summary", modelName, response, start, true);
      return response.text || "";
    } catch (error: any) {
      reportUsage("Quick Summary", modelName, null, start, false, { error: error.message });
      return "Summary unavailable.";
    }
  },

  async defineScientificTerm(term: string, paperTitle: string): Promise<any> {
    const ai = getAI();
    const start = Date.now();
    const modelName = 'gemini-3-flash-preview';
    try {
      const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: `Define "${term}" in context of "${paperTitle}".`,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
              researchContext: { type: Type.STRING },
              relatedTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["term", "definition", "researchContext", "relatedTopics"]
          }
        }
      }));
      reportUsage("Lexicon Lookup", modelName, response, start, true);
      return JSON.parse(response.text || "null");
    } catch (error: any) {
      reportUsage("Lexicon Lookup", modelName, null, start, false, { error: error.message });
      return null;
    }
  }
};

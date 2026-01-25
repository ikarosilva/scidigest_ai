
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Article, Book, UserReviews, Sentiment, FeedSourceType, AIConfig, SocialProfiles, Feed } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const extractJson = (text: string, fallback: any = []) => {
  try {
    const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(text);
  } catch (e) {
    console.warn("JSON Parse Warning:", e);
    return fallback;
  }
};

export const geminiService = {
  /**
   * Extracts scientific metadata from a raw PDF file.
   */
  async extractMetadataFromPDF(base64PDF: string): Promise<any> {
    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64PDF,
                },
              },
              {
                text: "Analyze this scientific paper and extract: Title, Authors (array of strings), Abstract, Year of publication, and 5 technical tags. Return as a JSON object with these keys.",
              },
            ],
          },
        ],
        config: { responseMimeType: "application/json" }
      });
      return extractJson(response.text || "{}", {});
    } catch (error) {
      console.error("PDF Extraction Error:", error);
      return null;
    }
  },

  /**
   * Suggests tags for a paper and identifies which ones are new to the user's trajectory.
   */
  async suggestTagsAndTopics(title: string, abstract: string, existingInterests: string[]): Promise<{ tags: string[], newTopics: string[] }> {
    const ai = getAI();
    const prompt = `
      Paper: ${title}
      Abstract: ${abstract}
      Existing User Interests: ${existingInterests.join(', ')}

      Analyze the paper. Provide:
      1. A list of 5 technical tags.
      2. Identify which of these tags represent a significant new research direction not covered by the existing interests.
      
      Return JSON: { "tags": [], "newTopics": [] }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return extractJson(response.text || '{"tags":[], "newTopics":[]}', { tags: [], newTopics: [] });
    } catch (error) {
      return { tags: [], newTopics: [] };
    }
  },

  /**
   * Generates a 1-sentence technical QuickTake for a paper.
   */
  async generateQuickTake(title: string, abstract: string): Promise<string> {
    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Provide exactly one sentence explaining the core technical contribution of this paper: \nTitle: ${title}\nAbstract: ${abstract}`,
        config: { temperature: 0.3 }
      });
      return response.text || "";
    } catch (error) {
      console.error("QuickTake Error:", error);
      return "";
    }
  },

  /**
   * Generates a multi-speaker podcast script for research queue.
   */
  async generatePodcastScript(articles: Article[]): Promise<string> {
    const ai = getAI();
    const context = articles.map(a => `Title: ${a.title}\nAbstract: ${a.abstract}`).join('\n\n');
    const prompt = `
      Create a conversational script for a scientific podcast briefing. 
      Speakers: Joe (a senior principal investigator) and Jane (a data scientist).
      Topic: Reviewing the latest papers in the user's research queue.
      Context:
      ${context}

      Format:
      Joe: [Speech]
      Jane: [Speech]
      
      Keep it high-level but technically accurate. Duration: 2-3 minutes.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "";
    } catch (error) {
      console.error("Podcast Script Error:", error);
      return "";
    }
  },

  /**
   * Converts script to multi-speaker audio.
   */
  async generatePodcastAudio(script: string): Promise<string | null> {
    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
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
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error) {
      console.error("Podcast Audio Error:", error);
      return null;
    }
  },

  async whatIfAssistant(message: string, history: any[], article: Article): Promise<string> {
    const ai = getAI();
    const systemInstruction = `You are a brilliant and highly technical research colleague discussing "${article.title}". Abstract: ${article.abstract}`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...history, { role: 'user', parts: [{ text: message }] }],
        config: { systemInstruction, temperature: 0.8 }
      });
      return response.text || "";
    } catch (error) {
      return "I'm having trouble processing that hypothesis.";
    }
  },

  async synthesizeResearch(articles: Article[], notes: string[]): Promise<string> {
    const ai = getAI();
    const context = articles.map(a => `PAPER: ${a.title}\nABSTRACT: ${a.abstract}`).join('\n\n');
    const prompt = `Synthesize these research papers into a scientific report. \n${context}\n${notes.join('\n')}`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });
      return response.text || "";
    } catch (error) {
      return "An error occurred during multi-document synthesis.";
    }
  },

  // Optimized to use gemini-3-flash-preview for search to avoid Pro-Image 429 quota errors
  async fetchScholarArticles(profiles: SocialProfiles): Promise<Partial<Article>[]> {
    const targetIdentity = profiles.googleScholar || profiles.name;
    const ai = getAI();
    const prompt = `Use the googleSearch tool to retrieve all publications from the following Google Scholar profile: "${targetIdentity}". Return JSON array.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      throw error;
    }
  },

  async summarizeArticle(title: string, abstract: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize in 3 bullets: \nTitle: ${title}\nAbstract: ${abstract}`,
    });
    return response.text || "";
  },

  /**
   * Ranks candidates based on user interests using AI recommendation bias.
   */
  async recommendArticles(ratedArticles: Article[], books: any[], candidates: any[], aiConfig: AIConfig): Promise<number[]> {
    const ai = getAI();
    const prompt = `Based on these rated papers: ${ratedArticles.map(a => `${a.title} (Rating: ${a.rating})`).join(', ')} 
    And these books: ${books.map(b => b.title).join(', ')}
    Rank the following candidates from 0 to ${candidates.length - 1} based on user interests. 
    Bias: ${aiConfig.recommendationBias}.
    Candidates: ${candidates.map((c, i) => `[${i}] ${c.title}: ${c.snippet}`).join('\n')}
    Return only a JSON array of indices in order of recommendation.`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      console.error("Recommend Error:", error);
      return candidates.map((_, i) => i);
    }
  },

  /**
   * Discovers research trajectories from social profiles using search grounding.
   */
  async discoverInterestsFromProfiles(profiles: SocialProfiles): Promise<string[]> {
    const ai = getAI();
    const prompt = `Using the googleSearch tool, analyze these profiles and identify granular research trajectories and scientific interests for this researcher: ${JSON.stringify(profiles)}. Return JSON array of strings.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      return [];
    }
  },

  /**
   * Retrieves trending research papers based on topics and timescale.
   */
  async getTrendingResearch(topics: string[], timeScale: string): Promise<any[]> {
    const ai = getAI();
    const prompt = `Using the googleSearch tool, find trending research papers in these topics: ${topics.join(', ')} over the last ${timeScale}. Return a JSON array of objects with keys: title, authors (array), snippet, year, source, heatScore (0-100), citationCount, scholarUrl.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      return [];
    }
  },

  /**
   * Searches for scientific books on Amazon using search grounding.
   */
  async searchAmazonBooks(topics: string[]): Promise<any[]> {
    const ai = getAI();
    const prompt = `Using the googleSearch tool, find highly-rated scientific books on Amazon for these topics: ${topics.join(', ')}. Return a JSON array of objects with keys: title, author, rating, price, amazonUrl, description.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      return [];
    }
  },

  /**
   * Maps author network and clusters using search grounding.
   */
  async discoverAuthorNetwork(profiles: SocialProfiles): Promise<any> {
    const ai = getAI();
    const prompt = `Using the googleSearch tool, map the co-author network and research clusters for: ${profiles.name}. Return a JSON object with keys: nodes (array of {id, name, level, cluster}), links (array of {source, target}), clusters (array of {name, color}).`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
      });
      return extractJson(response.text || '{}');
    } catch (error) {
      return null;
    }
  },

  /**
   * Finds references for a given article using search grounding.
   */
  async discoverReferences(article: Article): Promise<string[]> {
    const ai = getAI();
    const prompt = `Using the googleSearch tool, find the primary references and cited works for the paper "${article.title}" by ${article.authors.join(', ')}. Return a JSON array of bibliographic strings.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      return [];
    }
  },

  /**
   * Defines a scientific term within research context using AI.
   */
  async defineScientificTerm(term: string, articleTitle: string): Promise<any> {
    const ai = getAI();
    const prompt = `Define the scientific term "${term}" within the context of the paper "${articleTitle}". Return a JSON object with keys: term, definition, researchContext, relatedTopics (array of strings).`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return extractJson(response.text || '{}');
    } catch (error) {
      return null;
    }
  },

  /**
   * Fetches full details for a citation string using search grounding.
   */
  async fetchArticleDetails(citationStr: string): Promise<any> {
    const ai = getAI();
    const prompt = `Using the googleSearch tool, find detailed metadata for the following citation: "${citationStr}". Return a JSON object with keys: title, authors (array), abstract, year, pdfUrl, citationCount, tags (array).`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
      });
      return extractJson(response.text || '{}');
    } catch (error) {
      return null;
    }
  },

  /**
   * Adversarial peer review simulation.
   */
  async reviewAsReviewer2(title: string, abstract: string, prompt: string): Promise<string> {
    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${prompt}\n\nTitle: ${title}\nAbstract: ${abstract}`,
      });
      return response.text || "";
    } catch (error) {
      return "";
    }
  },

  /**
   * Generates a scientific critique of a paper.
   */
  async critiqueArticle(title: string, abstract: string): Promise<string> {
    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Provide a technical scientific critique of this paper, focusing on methodology and assumptions: \nTitle: ${title}\nAbstract: ${abstract}`,
      });
      return response.text || "";
    } catch (error) {
      return "";
    }
  },

  /**
   * Analyzes probability of AI generation.
   */
  async analyzeAIProbability(title: string, abstract: string): Promise<any> {
    const ai = getAI();
    const prompt = `Analyze this paper for markers of AI-generated content or LLM assistance: \nTitle: ${title}\nAbstract: ${abstract}. Return a JSON object with keys: probability (0-100), assessment (string), markers (array of strings).`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return extractJson(response.text || '{}');
    } catch (error) {
      return null;
    }
  },

  /**
   * Generates a conceptual quiz for an article.
   */
  async generateQuiz(title: string, abstract: string): Promise<any[]> {
    const ai = getAI();
    const prompt = `Generate a 10-question multiple-choice quiz to validate deep understanding of this paper. Focus on conceptual and technical details: \nTitle: ${title}\nAbstract: ${abstract}. Return a JSON array of objects with keys: question, options (array of 4), correctIndex (0-3).`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      return [];
    }
  },

  /**
   * Discovers relevant scientific feeds using search grounding.
   */
  async discoverScientificFeeds(interests: string[]): Promise<any[]> {
    const ai = getAI();
    const prompt = `Using the googleSearch tool, search major scientific publishers (Nature, Science, Elsevier, Springer, Cell), pre-print servers (arXiv, bioRxiv, medRxiv), and academic blogs to find active RSS, Atom, or scientific news feeds relevant to these research interests: ${interests.join(', ')}. 
    Look specifically for direct RSS URLs or "latest paper" feed links.
    Return a JSON array of objects with keys: name, url, description, type (e.g. Journal, Blog, Pre-print, Catalog).`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      return [];
    }
  },

  async getRadarUpdates(trackedPapers: string[], trackedAuthors: string[]): Promise<any[]> {
    const ai = getAI();
    const prompt = `Act as an automated research radar. Find updates for: \nPapers: ${trackedPapers.join(', ')}\nAuthors: ${trackedAuthors.join(', ')}. Return JSON.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      return extractJson(response.text || '[]');
    } catch (error) {
      return [];
    }
  }
};

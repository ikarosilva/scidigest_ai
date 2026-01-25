
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Article, Book, UserReviews, Sentiment, FeedSourceType, AIConfig, SocialProfiles, Feed } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const extractJson = (text: string, fallback: any = {}) => {
  if (!text) return fallback;
  try {
    // 1. Try to extract from Markdown code blocks first
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return JSON.parse(codeBlockMatch[1]);
    }

    // 2. Try to find the first valid JSON object or array structure
    // We use a non-greedy search to find the boundaries of the first structure
    const braceMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (braceMatch) {
      // Find the start of either { or [
      const startIdx = text.search(/\{|\[/);
      if (startIdx !== -1) {
        const char = text[startIdx];
        const endChar = char === '{' ? '}' : ']';
        const lastIdx = text.lastIndexOf(endChar);
        if (lastIdx !== -1) {
          const jsonStr = text.substring(startIdx, lastIdx + 1);
          return JSON.parse(jsonStr);
        }
      }
    }
    
    // 3. Fallback to direct parse
    return JSON.parse(text);
  } catch (e) {
    console.warn("JSON Parse Warning for text:", text, e);
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

  async fetchScholarArticles(profiles: SocialProfiles): Promise<Partial<Article>[]> {
    const targetIdentity = profiles.googleScholar || profiles.name;
    const ai = getAI();
    const prompt = `Use the googleSearch tool to retrieve all publications from the following Google Scholar profile: "${targetIdentity}". Return as a plain text JSON array string.`;
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
        config: { responseMimeType: "application/json" }
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
    const prompt = `Using the googleSearch tool, analyze these profiles and identify granular research trajectories and scientific interests for this researcher: ${JSON.stringify(profiles)}. Return only a JSON array string.`;
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
  },

  /**
   * Retrieves trending research papers specifically based on Google Scholar data.
   */
  async getTrendingResearch(topics: string[], timeScale: string): Promise<any> {
    const ai = getAI();
    const prompt = `Use Google Scholar via the googleSearch tool to find exactly 6 trending scientific research papers in these specific domains: ${topics.join(', ')} published within the last ${timeScale}. 
    Focus on papers with high citation velocity and significant impact.
    Return the results in a JSON array format where each object has these exact keys: title, authors (array of strings), snippet (1-2 sentence description), year (string), source (Journal/Conference name), heatScore (0-100 based on velocity), citationCount (actual Google Scholar citation count), scholarUrl.
    Ensure you ONLY return the JSON array, no prose.`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const results = extractJson(response.text || '[]');
      
      return { results, groundingSources: groundingChunks };
    } catch (error) {
      console.error("Trending Error:", error);
      return { results: [], groundingSources: [] };
    }
  },

  /**
   * Searches for scientific books on Amazon using search grounding.
   */
  async searchAmazonBooks(topics: string[]): Promise<any> {
    const ai = getAI();
    const prompt = `Using the googleSearch tool, find 6 highly-rated scientific monographs or textbooks on Amazon related to these topics: ${topics.join(', ')}. 
    Return a JSON array of objects with keys: title, author, rating (0.0-5.0), price (e.g. $49.99), amazonUrl, description (short).
    Ensure you ONLY return the JSON array.`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const results = extractJson(response.text || '[]');
      
      return { results, groundingSources: groundingChunks };
    } catch (error) {
      console.error("Amazon Books Error:", error);
      return { results: [], groundingSources: [] };
    }
  },

  /**
   * Maps author network and clusters using search grounding.
   */
  async discoverAuthorNetwork(profiles: SocialProfiles): Promise<any> {
    const ai = getAI();
    const prompt = `Using the googleSearch tool, map the co-author network and research clusters for: ${profiles.name}. Return a JSON-formatted response object with keys: nodes, links, clusters.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      return extractJson(response.text || '{}');
    } catch (error) {
      return null;
    }
  },

  /**
   * Finds references for a given article using search grounding.
   */
  async discoverReferences(article: Article): Promise<{ references: string[], groundingSources: any[] }> {
    const ai = getAI();
    const prompt = `Using the googleSearch tool, find the primary references and cited works for the paper "${article.title}" by ${article.authors.join(', ')}. Return them as a simple numbered list, one paper per line. Do not include any other text before or after the list.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      const text = response.text || "";
      const refs = text.split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 5);
      
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      return { references: refs, groundingSources: groundingChunks };
    } catch (error) {
      return { references: [], groundingSources: [] };
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
        config: { responseMimeType: "application/json" }
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
    const prompt = `Using the googleSearch tool, find detailed metadata for the following citation: "${citationStr}". Provide a JSON-like block with keys: title, authors (array), abstract, year, pdfUrl, citationCount, tags (array).`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      const metadata = extractJson(response.text || '{}', {});
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      return { ...metadata, groundingSources: groundingChunks };
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
        config: { responseMimeType: "application/json" }
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
        config: { responseMimeType: "application/json" }
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
    Return only a JSON array string of objects with keys: name, url, description, type.`;
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
  },

  async getRadarUpdates(trackedPapers: string[], trackedAuthors: string[]): Promise<any[]> {
    const ai = getAI();
    const prompt = `Using the googleSearch tool, act as an automated research radar. Find updates for: \nPapers: ${trackedPapers.join(', ')}\nAuthors: ${trackedAuthors.join(', ')}. Return only a JSON array string.`;
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

import { GEMINI_API_KEY } from "../configs/constant";

type StyleProfile = {
  displayName?: string;
  gender?: string;
  height?: number;
  weight?: number;
  skinTone?: string;
  skinToneHex?: string;
  bodyType?: string;
  faceShape?: string;
  styleMood?: string;
  stylePreferences?: string[];
};

type WardrobeSummaryItem = {
  id?: string;
  title?: string;
  category?: string;
  tag?: string;
  imageUrl?: string;
  outfit?: string;
  hairstyle?: string;
  explanation?: string;
  paletteLabels?: string[];
  isFavorite?: boolean;
  entryType?: string;
};

type GeneratedOutfit = {
  title: string;
  occasion: string;
  category: string;
  moods: string[];
  styleTags: string[];
  toneHints: string[];
  bodyHints: string[];
  palette: number[];
  paletteLabels: string[];
  hairstyle: string;
  outfit: string;
  explanation: string;
};

function parseJsonResponse<T>(value: string): T {
  const cleaned = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned) as T;
}

export class AIOutfitService {
  /**
   * Generate outfit recommendation using Gemini AI
   */
  async generateOutfitRecommendation(
    occasion: string,
    profile: StyleProfile,
    wardrobeItems: WardrobeSummaryItem[] = [],
    styleRequest = ""
  ): Promise<GeneratedOutfit> {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const wardrobeContext = this.buildWardrobeContext(wardrobeItems);
    const profileContext = this.buildProfileContext(profile);
    
    const prompt = `You are a professional fashion stylist. Generate a complete outfit recommendation for the following request:

Occasion: ${occasion}
User's exact styling request: ${styleRequest || occasion}

User Profile:
${profileContext}

Wardrobe Context:
${wardrobeContext}

Please generate a JSON response with the following structure:
{
  "title": "Creative outfit name",
  "occasion": "${occasion}",
  "category": "Formal/Casual/Party/Elegant/etc",
  "moods": ["mood1", "mood2", "mood3"],
  "styleTags": ["style1", "style2", "style3"],
  "toneHints": ["tone1", "tone2", "tone3"],
  "bodyHints": ["bodyType1", "bodyType2"],
  "paletteLabels": ["color1", "color2", "color3", "color4"],
  "hairstyle": "Detailed hairstyle suggestion",
  "outfit": "Detailed outfit description including all pieces",
  "explanation": "Why this outfit works for the user and occasion"
}

Make the recommendation personalized, fashion-forward, and practical. Consider the user's body type, skin tone, and style preferences. If they have wardrobe items, suggest how to incorporate them.`;

    try {
      const response = await this.callGeminiAPI(prompt, "application/json");
      const parsed = parseJsonResponse<Partial<GeneratedOutfit>>(response);
      
      // Convert palette labels to hex colors
      const palette = this.convertPaletteLabelsToHex(parsed.paletteLabels || []);
      
      return {
        title: parsed.title || "AI Generated Outfit",
        occasion: parsed.occasion || occasion,
        category: parsed.category || "Casual",
        moods: Array.isArray(parsed.moods) ? parsed.moods : [],
        styleTags: Array.isArray(parsed.styleTags) ? parsed.styleTags : [],
        toneHints: Array.isArray(parsed.toneHints) ? parsed.toneHints : [],
        bodyHints: Array.isArray(parsed.bodyHints) ? parsed.bodyHints : [],
        palette,
        paletteLabels: Array.isArray(parsed.paletteLabels) ? parsed.paletteLabels : [],
        hairstyle: parsed.hairstyle || "Natural style",
        outfit: parsed.outfit || "Complete outfit description",
        explanation: parsed.explanation || "Personalized for you",
      };
    } catch (error) {
      console.error("Error generating outfit recommendation:", error);
      throw new Error(`Failed to generate outfit: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Generate multiple outfit options for different occasions
   */
  async generateMultipleOutfits(
    occasions: string[],
    profile: StyleProfile,
    wardrobeItems: WardrobeSummaryItem[] = []
  ): Promise<GeneratedOutfit[]> {
    const results = await Promise.all(
      occasions.map((occasion) =>
        this.generateOutfitRecommendation(occasion, profile, wardrobeItems)
      )
    );
    return results;
  }

  /**
   * Generate chat response for AI Stylist
   */
  async generateChatResponse(
    message: string,
    profile: StyleProfile,
    conversationHistory: { role: string; content: string }[] = []
  ): Promise<string> {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const profileContext = this.buildProfileContext(profile);
    const systemInstruction = `You are a professional AI fashion stylist for Fashiome. You help users with:
- Outfit recommendations for any occasion
- Style advice based on their body type and preferences
- Color coordination and palette suggestions
- Wardrobe building tips
- Fashion trends and timeless classics

User Profile:
${profileContext}

Be helpful, fashionable, and practical. Give specific, actionable advice. If they ask for outfit suggestions, provide detailed descriptions including specific pieces, colors, and styling tips.`;

    const conversationContext = conversationHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const prompt = conversationContext 
      ? `${conversationContext}\n\nUser: ${message}`
      : `User: ${message}`;

    try {
      return await this.callGeminiAPI(prompt, "text/plain", systemInstruction);
    } catch (error) {
      console.error("Error generating chat response:", error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Analyze uploaded image to extract style profile
   */
  async analyzeImageForStyleProfile(
    imageBase64: string,
    mimeType = "image/jpeg"
  ): Promise<Partial<StyleProfile>> {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const prompt = `Analyze this fashion image and extract the following information in JSON format:
{
  "gender": "male/female",
  "bodyType": "hourglass/pear/rectangle/athletic/balanced/petite",
  "skinTone": "fair/light/medium/olive/dark",
  "styleMood": "minimalist/bold/romantic/edgy/classic",
  "stylePreferences": ["style1", "style2", "style3"]
}

Focus on the person's appearance and the style of the outfit they're wearing.`;

    try {
      const response = await this.callGeminiAPIWithImage(
        imageBase64,
        prompt,
        "application/json",
        mimeType
      );
      return parseJsonResponse<Partial<StyleProfile>>(response);
    } catch (error) {
      console.error("Error analyzing image:", error);
      throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async callGeminiAPI(
    prompt: string,
    responseMimeType: string = "text/plain",
    systemInstruction?: string
  ): Promise<string> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      ...(systemInstruction ? {
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        }
      } : {}),
      generationConfig: {
        responseMimeType,
        temperature: 0.8
      }
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API returned status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No response text returned from Gemini API");
    }

    return text;
  }

  private async callGeminiAPIWithImage(
    imageBase64: string,
    prompt: string,
    responseMimeType: string = "text/plain",
    mimeType = "image/jpeg"
  ): Promise<string> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        responseMimeType,
        temperature: 0.7
      }
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API returned status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No response text returned from Gemini API");
    }

    return text;
  }

  private buildProfileContext(profile: StyleProfile): string {
    const parts = [];
    if (profile.gender) parts.push(`Gender: ${profile.gender}`);
    if (profile.height) parts.push(`Height: ${profile.height}cm`);
    if (profile.weight) parts.push(`Weight: ${profile.weight}kg`);
    if (profile.skinTone) parts.push(`Skin Tone: ${profile.skinTone}`);
    if (profile.bodyType) parts.push(`Body Type: ${profile.bodyType}`);
    if (profile.faceShape) parts.push(`Face Shape: ${profile.faceShape}`);
    if (profile.styleMood) parts.push(`Style Mood: ${profile.styleMood}`);
    if (profile.stylePreferences?.length) {
      parts.push(`Style Preferences: ${profile.stylePreferences.join(", ")}`);
    }
    return parts.length > 0 ? parts.join("\n") : "No profile data available";
  }

  private buildWardrobeContext(items: WardrobeSummaryItem[]): string {
    if (items.length === 0) return "No wardrobe items available";
    return items.slice(0, 10).map(item => 
      `- ${item.title || item.tag || item.category}: ${item.outfit || item.explanation || ""}`
    ).join("\n");
  }

  private convertPaletteLabelsToHex(labels: string[]): number[] {
    // Simple color name to hex mapping
    const colorMap: Record<string, number> = {
      "ivory": 0xfff4ead8,
      "champagne": 0xffd5b38a,
      "cocoa": 0xff8c6d54,
      "olive": 0xff37443a,
      "pearl": 0xffd9dde5,
      "slate blue": 0xff7d8ca3,
      "navy": 0xff2d3748,
      "soft white": 0xfff4efe8,
      "black": 0xff1d1d1d,
      "berry": 0xff7a2147,
      "gold": 0xffd5a56b,
      "rose": 0xfff3d8d8,
      "stone": 0xffe9decb,
      "camel": 0xff9b7d58,
      "sage": 0xff6e7b56,
      "charcoal": 0xff2d3640,
      "cream": 0xfff7f1ea,
      "soft blue": 0xff8ba4c4,
      "taupe": 0xff6a5847,
      "plum": 0xff301f2f,
      "blush": 0xffd8b7c3,
      "porcelain": 0xfff3ebe4,
      "mocha": 0xff8c5f4d,
      "burnt orange": 0xffc76a32,
      "midnight": 0xff243447,
      "sand": 0xfff2d2a9,
      "moss": 0xff5b7b5d,
      "white": 0xfff7f7f7,
      "silver grey": 0xffb8bcc7,
      "graphite": 0xff464c59,
      "oat": 0xffede4d6,
      "off white": 0xfffbfaf8,
    };

    return labels.map(label => {
      const normalized = label.toLowerCase().trim();
      return colorMap[normalized] || this.colorFromLabel(normalized);
    });
  }

  private colorFromLabel(label: string): number {
    // Stable fallback for an AI color name that is not in the curated map.
    let hash = 0;
    for (const character of label) {
      hash = (hash * 31 + character.charCodeAt(0)) & 0xffffff;
    }
    return 0xff000000 + hash;
  }
}

export const aiOutfitService = new AIOutfitService();

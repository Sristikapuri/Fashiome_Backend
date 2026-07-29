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
      return this.buildHeuristicOutfit(occasion, profile, wardrobeItems, styleRequest);
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
      console.error("Error generating outfit recommendation, using heuristic fallback:", error);
      return this.buildHeuristicOutfit(occasion, profile, wardrobeItems, styleRequest);
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
    conversationHistory: { role: string; content: string }[] = [],
    hasRecommendation = false
  ): Promise<string> {
    if (!GEMINI_API_KEY) {
      return this.buildHeuristicChatReply(hasRecommendation);
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
      console.error("Error generating chat response, using heuristic fallback:", error);
      return this.buildHeuristicChatReply(hasRecommendation);
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

  /**
   * Rule-based outfit used when Gemini is unavailable (missing key, quota exhausted, network error)
   * so the dashboard, generator, and chat still return a usable recommendation instead of erroring out.
   */
  private buildHeuristicOutfit(
    occasion: string,
    profile: StyleProfile,
    wardrobeItems: WardrobeSummaryItem[] = [],
    styleRequest = ""
  ): GeneratedOutfit {
    const normalized = `${styleRequest} ${occasion}`.toLowerCase();

    const presets: Record<string, Omit<GeneratedOutfit, "occasion">> = {
      wedding: {
        title: "Guest-Ready Elegance",
        category: "Formal",
        moods: ["Elegant", "Romantic", "Polished"],
        styleTags: ["Tailored", "Statement Fabric", "Refined"],
        toneHints: ["Warm", "Soft"],
        bodyHints: ["Flattering silhouette"],
        palette: [],
        paletteLabels: ["Champagne", "Blush", "Gold"],
        hairstyle: "Soft waves with a half-up twist",
        outfit: "A floor-length satin or chiffon dress (or a tailored suit) in a soft champagne tone, finished with delicate gold jewelry and heeled sandals.",
        explanation: "A wedding guest look calls for elevated, photo-ready pieces that stay refined without competing with the couple.",
      },
      party: {
        title: "After-Dark Glam",
        category: "Party",
        moods: ["Bold", "Confident", "Glamorous"],
        styleTags: ["Statement", "Sleek", "Night-out"],
        toneHints: ["Rich", "Dramatic"],
        bodyHints: ["Body-conscious fit"],
        palette: [],
        paletteLabels: ["Black", "Berry", "Silver Grey"],
        hairstyle: "Sleek low bun or glossy curls",
        outfit: "A fitted bodycon dress or a satin two-piece set in black or berry, paired with strappy heels and bold accessories.",
        explanation: "A party look benefits from a confident silhouette and a touch of shine to stand out after dark.",
      },
      office: {
        title: "Polished Professional",
        category: "Office",
        moods: ["Sharp", "Composed", "Minimalist"],
        styleTags: ["Tailored", "Structured", "Classic"],
        toneHints: ["Neutral", "Cool"],
        bodyHints: ["Structured fit"],
        palette: [],
        paletteLabels: ["Navy", "Charcoal", "Soft White"],
        hairstyle: "Neat low ponytail or a clean blowout",
        outfit: "A tailored blazer over a soft white shirt, paired with straight-leg trousers or a pencil skirt in navy or charcoal, finished with low block heels.",
        explanation: "Structured, neutral pieces read as capable and put-together for the workplace.",
      },
      travel: {
        title: "Effortless Traveler",
        category: "Casual",
        moods: ["Relaxed", "Practical", "Chic"],
        styleTags: ["Comfort-first", "Layered", "Easy"],
        toneHints: ["Neutral", "Earthy"],
        bodyHints: ["Relaxed fit"],
        palette: [],
        paletteLabels: ["Stone", "Cream", "Taupe"],
        hairstyle: "Low messy bun or a simple braid",
        outfit: "Soft joggers or wide-leg trousers, a lightweight layered top, an oversized cardigan, and comfortable slip-on sneakers.",
        explanation: "Travel calls for breathable, easy layers that still look put together for the airport or road.",
      },
      "date night": {
        title: "Effortless Romance",
        category: "Date Night",
        moods: ["Romantic", "Soft", "Confident"],
        styleTags: ["Feminine", "Fitted", "Warm"],
        toneHints: ["Warm", "Soft"],
        bodyHints: ["Flattering fit"],
        palette: [],
        paletteLabels: ["Rose", "Blush", "Mocha"],
        hairstyle: "Soft curls or a romantic half-up style",
        outfit: "A fitted midi dress or a silky camisole with tailored trousers, layered with delicate jewelry and heeled mules.",
        explanation: "Soft, romantic tones and a flattering fit strike the right balance for a date night.",
      },
      festival: {
        title: "Festival Free Spirit",
        category: "Festival",
        moods: ["Playful", "Bold", "Bohemian"],
        styleTags: ["Layered", "Print-mixed", "Expressive"],
        toneHints: ["Warm", "Vibrant"],
        bodyHints: ["Relaxed, layered fit"],
        palette: [],
        paletteLabels: ["Gold", "Burnt Orange", "Sand"],
        hairstyle: "Braided crown or loose beach waves",
        outfit: "A flowy printed dress or crochet top with denim shorts, layered jewelry, and comfortable boots.",
        explanation: "Festival dressing is about expressive layers and movement-friendly pieces that hold up all day.",
      },
      formal: {
        title: "Refined Formal",
        category: "Formal",
        moods: ["Elegant", "Sharp", "Timeless"],
        styleTags: ["Tailored", "Structured", "Classic"],
        toneHints: ["Cool", "Neutral"],
        bodyHints: ["Structured silhouette"],
        palette: [],
        paletteLabels: ["Midnight", "Graphite", "Pearl"],
        hairstyle: "Sleek updo or a precise side part",
        outfit: "A tailored suit or a structured floor-length gown in midnight or graphite, finished with minimal, polished accessories.",
        explanation: "Formal events call for clean lines and a controlled palette that reads as timeless.",
      },
      casual: {
        title: "Everyday Ease",
        category: "Casual",
        moods: ["Relaxed", "Fresh", "Effortless"],
        styleTags: ["Comfort-first", "Versatile", "Layered"],
        toneHints: ["Neutral", "Soft"],
        bodyHints: ["Relaxed fit"],
        palette: [],
        paletteLabels: ["Oat", "Soft Blue", "White"],
        hairstyle: "Natural texture or a simple ponytail",
        outfit: "Well-fitted jeans or joggers, a soft tee or knit, an open layer like a shirt or cardigan, and clean sneakers.",
        explanation: "Comfortable, versatile pieces in soft neutrals cover most casual, everyday occasions.",
      },
    };

    const key = Object.keys(presets).find((preset) => normalized.includes(preset)) || "casual";
    const preset = presets[key];
    const wardrobeNote = wardrobeItems.length
      ? " I've kept a few pieces already in your wardrobe in mind for this direction."
      : "";

    return {
      title: preset.title,
      occasion,
      category: preset.category,
      moods: preset.moods,
      styleTags: preset.styleTags,
      toneHints: preset.toneHints,
      bodyHints: preset.bodyHints,
      palette: this.convertPaletteLabelsToHex(preset.paletteLabels),
      paletteLabels: preset.paletteLabels,
      hairstyle: preset.hairstyle,
      outfit: preset.outfit,
      explanation: `${preset.explanation}${wardrobeNote}`,
    };
  }

  private buildHeuristicChatReply(hasRecommendation: boolean): string {
    if (hasRecommendation) {
      return "Here's a look I've put together for you below — pieces, palette, and styling notes included. Tell me the occasion, vibe, or colors you'd like instead and I'll adjust it.";
    }
    return "I'm here to help with outfit ideas, color palettes, hairstyles, and wardrobe tips! Tell me the occasion, weather, or vibe you're dressing for and I'll put together a complete look for you.";
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

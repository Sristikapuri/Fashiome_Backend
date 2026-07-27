import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { OPENAI_API_KEY } from "../configs/constant";

export class AIImageService {
  private openai: OpenAI;

  constructor() {
    if (!OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY is not defined. AI image generation will not work.");
    }
    this.openai = new OpenAI({
      // Keep server startup usable in development; generation itself still
      // fails explicitly until a real key is configured.
      apiKey: OPENAI_API_KEY || "not-configured",
    });
  }

  /**
   * Generate an outfit image using DALL-E 3
   * @param prompt - Detailed description of the outfit to generate
   * @param style - Style preference (e.g., "photorealistic", "artistic", "minimalist")
   * @returns URL of the generated image
   */
  async generateOutfitImage(
    prompt: string,
    style: "photorealistic" | "artistic" | "minimalist" = "photorealistic"
  ): Promise<string> {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const enhancedPrompt = this.buildOutfitPrompt(prompt, style);

    try {
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: style === "photorealistic" ? "natural" : "vivid",
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        throw new Error("No image URL returned from DALL-E 3");
      }

      return imageUrl;
    } catch (error) {
      console.error("Error generating outfit image:", error);
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * DALL-E URLs are temporary. Persist the generated file in the backend's
   * public uploads directory before returning it to either client.
   */
  async generateAndStoreOutfitImage(
    prompt: string,
    uploadsDirectory: string,
    style: "photorealistic" | "artistic" | "minimalist" = "photorealistic"
  ): Promise<string> {
    const temporaryUrl = await this.generateOutfitImage(prompt, style);
    const response = await fetch(temporaryUrl);
    if (!response.ok) {
      throw new Error(`Generated image could not be downloaded (HTTP ${response.status})`);
    }

    await fs.mkdir(uploadsDirectory, { recursive: true });
    const fileName = `ai-generated-${Date.now()}-${Math.floor(Math.random() * 10000)}.png`;
    await fs.writeFile(
      path.join(uploadsDirectory, fileName),
      Buffer.from(await response.arrayBuffer())
    );
    return `/uploads/${fileName}`;
  }

  /**
   * Build an enhanced prompt for DALL-E 3 based on the user's description
   */
  private buildOutfitPrompt(basePrompt: string, style: string): string {
    const styleInstructions = {
      photorealistic: "photorealistic, high fashion photography, professional lighting, fashion magazine quality, detailed fabric textures",
      artistic: "artistic fashion illustration, stylized, creative, fashion sketch style, elegant lines",
      minimalist: "minimalist fashion photography, clean composition, neutral background, modern aesthetic",
    };

    return `A professional fashion photograph of ${basePrompt}. ${styleInstructions[style]}. The image should show a complete outfit with good lighting and composition suitable for an e-commerce fashion platform. High quality, detailed, fashion-forward.`;
  }

  /**
   * Generate multiple outfit variations for different occasions
   */
  async generateOutfitVariations(
    baseDescription: string,
    occasions: string[]
  ): Promise<{ occasion: string; imageUrl: string }[]> {
    const results = await Promise.all(
      occasions.map(async (occasion) => {
        const prompt = `${baseDescription} suitable for ${occasion}`;
        try {
          const imageUrl = await this.generateOutfitImage(prompt);
          return { occasion, imageUrl };
        } catch (error) {
          console.error(`Failed to generate image for ${occasion}:`, error);
          return { occasion, imageUrl: "" };
        }
      })
    );

    return results.filter((r) => r.imageUrl !== "");
  }
}

export const aiImageService = new AIImageService();

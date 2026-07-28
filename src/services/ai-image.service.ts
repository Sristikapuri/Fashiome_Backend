import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { OPENAI_API_KEY } from "../configs/constant";
import { cloudStorageEnabled, uploadDataUrl } from "./media-storage.service";

export class AIImageService {
  private openai: OpenAI;

  constructor() {
    if (!OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY is not defined. AI image generation will not work.");
    }
    this.openai = new OpenAI({
     
      apiKey: OPENAI_API_KEY || "not-configured",
    });
  }

  /**
   * Generate an outfit image using gpt-image-1
   * @param prompt - Detailed description of the outfit to generate
   * @param style - Style preference (e.g., "photorealistic", "artistic", "minimalist")
   * @returns Base64 data URL of the generated image
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
        model: "gpt-image-1",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
      });

      const imageData = response.data[0]?.b64_json;
      if (!imageData) {
        throw new Error("No image data returned from gpt-image-1");
      }

      return `data:image/png;base64,${imageData}`;
    } catch (error) {
      console.error("Error generating outfit image:", error);
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Persist the generated image in the backend's public uploads directory
   * before returning it to either client.
   */
  async generateAndStoreOutfitImage(
    prompt: string,
    uploadsDirectory: string,
    style: "photorealistic" | "artistic" | "minimalist" = "photorealistic"
  ): Promise<string> {
    const dataUrl = await this.generateOutfitImage(prompt, style);
    if (cloudStorageEnabled) return (await uploadDataUrl(dataUrl)).url;
    const base64Data = dataUrl.split(",")[1];

    await fs.mkdir(uploadsDirectory, { recursive: true });
    const fileName = `ai-generated-${Date.now()}-${Math.floor(Math.random() * 10000)}.png`;
    await fs.writeFile(
      path.join(uploadsDirectory, fileName),
      Buffer.from(base64Data, "base64")
    );
    return `/uploads/${fileName}`;
  }

  
  private buildOutfitPrompt(basePrompt: string, style: string): string {
    const styleInstructions = {
      photorealistic: "photorealistic, high fashion photography, professional lighting, fashion magazine quality, detailed fabric textures",
      artistic: "artistic fashion illustration, stylized, creative, fashion sketch style, elegant lines",
      minimalist: "minimalist fashion photography, clean composition, neutral background, modern aesthetic",
    };

    return `A professional fashion photograph of ${basePrompt}. ${styleInstructions[style]}. The image should show a complete outfit with good lighting and composition suitable for an e-commerce fashion platform. High quality, detailed, fashion-forward.`;
  }

  
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

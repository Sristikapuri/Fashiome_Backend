import os from "os";
import path from "path";
import fs from "fs/promises";

// Automocking the real `openai` class would skip its constructor entirely
// (Jest's automocker never runs the real constructor body), so instance
// properties like `this.images` would never exist on the mocked instance.
// A factory mock that we control the constructor implementation of avoids that.
jest.mock("openai", () => jest.fn());

describe("AIImageService", () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
    jest.restoreAllMocks();
  });

  describe("without OPENAI_API_KEY configured", () => {
    let aiImageService: any;
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
      // Set (not delete) to block dotenv from refilling this from the repo's
      // real .env file on the next fresh require — configs/constant.ts only
      // gets its default fallback when the key is already present but empty.
      process.env.OPENAI_API_KEY = "";
      jest.resetModules();
      warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      const OpenAIMock = require("openai") as jest.Mock;
      OpenAIMock.mockImplementation(() => ({ images: { generate: jest.fn() } }));

      const mod = require("../../src/services/ai-image.service");
      aiImageService = mod.aiImageService;
    });

    test("constructor logs a warning when OPENAI_API_KEY is missing", () => {
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("OPENAI_API_KEY is not defined")
      );
    });

    test("generateOutfitImage throws immediately without calling the OpenAI client", async () => {
      await expect(aiImageService.generateOutfitImage("a red dress")).rejects.toThrow(
        "OPENAI_API_KEY is not configured"
      );
    });
  });

  describe("with OPENAI_API_KEY configured", () => {
    let aiImageService: any;
    let mockGenerate: jest.Mock;

    beforeEach(() => {
      process.env.OPENAI_API_KEY = "test-key";
      jest.resetModules();
      mockGenerate = jest.fn();

      const OpenAIMock = require("openai") as jest.Mock;
      OpenAIMock.mockImplementation(() => ({ images: { generate: mockGenerate } }));

      const mod = require("../../src/services/ai-image.service");
      aiImageService = mod.aiImageService;
    });

    test("generateOutfitImage returns a base64 data URL on success", async () => {
      mockGenerate.mockResolvedValue({ data: [{ b64_json: "abc123" }] });

      const result = await aiImageService.generateOutfitImage("a red dress", "artistic");

      expect(result).toBe("data:image/png;base64,abc123");
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-image-1",
          prompt: expect.stringContaining("a red dress"),
        })
      );
    });

    test("generateOutfitImage defaults to the photorealistic style prompt", async () => {
      mockGenerate.mockResolvedValue({ data: [{ b64_json: "abc123" }] });

      await aiImageService.generateOutfitImage("a blazer");

      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: expect.stringContaining("photorealistic") })
      );
    });

    test("generateOutfitImage throws when the response has no b64_json", async () => {
      mockGenerate.mockResolvedValue({ data: [{}] });

      await expect(aiImageService.generateOutfitImage("a red dress")).rejects.toThrow(
        "No image data returned from gpt-image-1"
      );
    });

    test("generateOutfitImage wraps the underlying error when the API call rejects", async () => {
      mockGenerate.mockRejectedValue(new Error("rate limited"));

      await expect(aiImageService.generateOutfitImage("a red dress")).rejects.toThrow(
        "Failed to generate image: rate limited"
      );
    });

    test("generateAndStoreOutfitImage writes the image to disk when cloud storage is disabled", async () => {
      mockGenerate.mockResolvedValue({
        data: [{ b64_json: Buffer.from("hello-image-bytes").toString("base64") }],
      });
      const uploadsDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-image-test-"));

      try {
        const result = await aiImageService.generateAndStoreOutfitImage("a blazer", uploadsDir);

        expect(result).toMatch(/^\/uploads\/ai-generated-\d+-\d+\.png$/);
        const fileName = result.split("/").pop()!;
        const written = await fs.readFile(path.join(uploadsDir, fileName));
        expect(written.toString()).toBe("hello-image-bytes");
      } finally {
        await fs.rm(uploadsDir, { recursive: true, force: true });
      }
    });

    test("generateOutfitVariations filters out occasions whose image generation failed", async () => {
      mockGenerate.mockImplementation(async ({ prompt }: { prompt: string }) => {
        if (prompt.includes("funeral")) throw new Error("nope");
        return { data: [{ b64_json: "abc" }] };
      });

      const results = await aiImageService.generateOutfitVariations("a black dress", [
        "party",
        "funeral",
        "office",
      ]);

      expect(results.map((r: { occasion: string }) => r.occasion)).toEqual(["party", "office"]);
      results.forEach((r: { imageUrl: string }) =>
        expect(r.imageUrl).toBe("data:image/png;base64,abc")
      );
    });

    test("generateOutfitVariations returns an empty array when every occasion fails", async () => {
      mockGenerate.mockRejectedValue(new Error("always fails"));

      const results = await aiImageService.generateOutfitVariations("a black dress", ["party"]);

      expect(results).toEqual([]);
    });
  });

  describe("generateAndStoreOutfitImage with cloud storage enabled", () => {
    afterEach(() => {
      jest.dontMock("../../src/services/media-storage.service");
    });

    test("uploads via media-storage.service and returns its hosted URL instead of writing to disk", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      jest.resetModules();

      const mockUploadDataUrl = jest
        .fn()
        .mockResolvedValue({ url: "https://cdn.example.com/img.png", publicId: "abc" });
      jest.doMock("../../src/services/media-storage.service", () => ({
        cloudStorageEnabled: true,
        uploadDataUrl: mockUploadDataUrl,
      }));

      const OpenAIMock = require("openai") as jest.Mock;
      const mockGenerate = jest.fn().mockResolvedValue({ data: [{ b64_json: "abc" }] });
      OpenAIMock.mockImplementation(() => ({ images: { generate: mockGenerate } }));

      const mod = require("../../src/services/ai-image.service");
      const result = await mod.aiImageService.generateAndStoreOutfitImage("a gown", "/tmp/unused");

      expect(mockUploadDataUrl).toHaveBeenCalledWith("data:image/png;base64,abc");
      expect(result).toBe("https://cdn.example.com/img.png");
    });
  });
});

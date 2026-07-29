describe("AIOutfitService", () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete (global as unknown as { fetch?: unknown }).fetch;
    jest.resetModules();
  });

  describe("without GEMINI_API_KEY (heuristic fallback path)", () => {
    let aiOutfitService: any;

    beforeEach(() => {
      // Set (rather than delete) to an empty string: configs/constant.ts calls
      // dotenv.config() at import time, which only fills in keys that are
      // `undefined` in process.env. The real .env file in this repo has a
      // GEMINI_API_KEY set, so deleting the var here would let dotenv refill
      // it from disk on the next fresh require. An empty string blocks that.
      process.env.GEMINI_API_KEY = "";
      jest.resetModules();
      const mod = require("../../src/services/ai-outfit.service");
      aiOutfitService = mod.aiOutfitService;
    });

    test.each([
      ["wedding", "wedding"],
      ["party", "party"],
      ["office", "office"],
      ["travel", "travel"],
      ["date night", "date night"],
      ["festival", "festival"],
      ["formal", "formal"],
      ["casual", "casual"],
      ["something totally unrelated", "casual"],
    ])(
      "buildHeuristicOutfit matches the %s preset",
      async (occasion, _expectedPresetKey) => {
        const result = await aiOutfitService.generateOutfitRecommendation(
          occasion,
          { gender: "female", height: 165, weight: 58, skinTone: "olive", bodyType: "hourglass", faceShape: "oval", styleMood: "romantic", stylePreferences: ["boho"] },
          [],
          ""
        );

        expect(result.occasion).toBe(occasion);
        expect(result.title).toEqual(expect.any(String));
        expect(result.paletteLabels.length).toBeGreaterThan(0);
        expect(result.palette.length).toBe(result.paletteLabels.length);
      }
    );

    test("includes a wardrobe note in the explanation when wardrobe items are provided", async () => {
      const result = await aiOutfitService.generateOutfitRecommendation(
        "casual",
        {},
        [{ title: "Blue Jeans", category: "bottoms", outfit: "jeans" }],
        ""
      );

      expect(result.explanation).toMatch(/kept a few pieces already in your wardrobe/i);
    });

    test("does not include a wardrobe note when no wardrobe items are provided", async () => {
      const result = await aiOutfitService.generateOutfitRecommendation("casual", {}, [], "");
      expect(result.explanation).not.toMatch(/kept a few pieces/i);
    });

    test("generateMultipleOutfits maps across several occasions using the heuristic path", async () => {
      const results = await aiOutfitService.generateMultipleOutfits(
        ["wedding", "office", "travel"],
        { gender: "male" },
        []
      );

      expect(results).toHaveLength(3);
      expect(results.map((r: { occasion: string }) => r.occasion)).toEqual([
        "wedding",
        "office",
        "travel",
      ]);
    });

    test("generateChatResponse returns the canned reply mentioning an existing recommendation", async () => {
      const reply = await aiOutfitService.generateChatResponse(
        "What do you think?",
        {},
        [],
        true
      );
      expect(reply).toMatch(/look I've put together/i);
    });

    test("generateChatResponse returns the generic canned reply with no recommendation", async () => {
      const reply = await aiOutfitService.generateChatResponse(
        "Help me pick an outfit",
        {},
        [],
        false
      );
      expect(reply).toMatch(/here to help with outfit ideas/i);
    });

    test("analyzeImageForStyleProfile throws synchronously when no API key is configured", async () => {
      await expect(
        aiOutfitService.analyzeImageForStyleProfile("base64data", "image/jpeg")
      ).rejects.toThrow("GEMINI_API_KEY is not configured");
    });

    test("convertPaletteLabelsToHex resolves curated colors (via heuristic outfit)", async () => {
      const result = await aiOutfitService.generateOutfitRecommendation("office", {}, [], "");
      // "navy", "charcoal", "soft white" are all in the curated colorMap for the office preset.
      expect(result.palette.every((value: number) => typeof value === "number")).toBe(true);
      expect(result.palette[0]).toBe(0xff2d3748); // navy from curated map
    });
  });

  describe("with GEMINI_API_KEY configured (Gemini fetch path)", () => {
    let aiOutfitService: any;

    beforeEach(() => {
      process.env.GEMINI_API_KEY = "test-key";
      jest.resetModules();
      const mod = require("../../src/services/ai-outfit.service");
      aiOutfitService = mod.aiOutfitService;
    });

    function mockFetchOnce(response: { ok: boolean; status?: number; json?: () => Promise<unknown>; text?: () => Promise<string> }) {
      global.fetch = jest.fn().mockResolvedValue(response) as unknown as typeof fetch;
    }

    test("generateOutfitRecommendation parses a well-formed Gemini JSON response", async () => {
      const geminiPayload = {
        title: "Runway Ready",
        occasion: "gala",
        category: "Formal",
        moods: ["Bold"],
        styleTags: ["Sleek"],
        toneHints: ["Cool"],
        bodyHints: ["Structured"],
        paletteLabels: ["Navy", "Unknown Shimmer Tone"],
        hairstyle: "Updo",
        outfit: "Gown",
        explanation: "Because it's a gala",
      };

      mockFetchOnce({
        ok: true,
        json: async () => ({
          candidates: [
            { content: { parts: [{ text: "```json\n" + JSON.stringify(geminiPayload) + "\n```" }] } },
          ],
        }),
      });

      const result = await aiOutfitService.generateOutfitRecommendation(
        "gala",
        { gender: "female" },
        [],
        "something glamorous"
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("generativelanguage.googleapis.com"),
        expect.objectContaining({ method: "POST" })
      );
      expect(result.title).toBe("Runway Ready");
      expect(result.paletteLabels).toEqual(["Navy", "Unknown Shimmer Tone"]);
      // "Navy" is curated, "Unknown Shimmer Tone" should fall back to the hash-based color.
      expect(result.palette[0]).toBe(0xff2d3748);
      expect(result.palette[1]).not.toBe(0xff2d3748);
      expect(typeof result.palette[1]).toBe("number");
    });

    test("generateOutfitRecommendation falls back to the heuristic when the response body is not ok", async () => {
      mockFetchOnce({
        ok: false,
        status: 429,
        text: async () => "quota exceeded",
      });

      const result = await aiOutfitService.generateOutfitRecommendation(
        "office",
        {},
        [],
        ""
      );

      // Falls back to buildHeuristicOutfit, so office preset kicks in.
      expect(result.title).toBe("Polished Professional");
    });

    test("generateOutfitRecommendation falls back to the heuristic when the fetch call rejects", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

      const result = await aiOutfitService.generateOutfitRecommendation(
        "wedding",
        {},
        [],
        ""
      );

      expect(result.title).toBe("Guest-Ready Elegance");
    });

    test("generateOutfitRecommendation falls back to the heuristic when the Gemini response has no text", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({ candidates: [] }),
      });

      const result = await aiOutfitService.generateOutfitRecommendation("travel", {}, [], "");
      expect(result.title).toBe("Effortless Traveler");
    });

    test("generateOutfitRecommendation falls back to the heuristic when the Gemini response text is malformed JSON", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "not valid json {{{" }] } }],
        }),
      });

      const result = await aiOutfitService.generateOutfitRecommendation("casual", {}, [], "");
      expect(result.title).toBe("Everyday Ease");
    });

    test("generateOutfitRecommendation fills defaults for missing fields in a partial Gemini JSON response", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "{}" }] } }],
        }),
      });

      const result = await aiOutfitService.generateOutfitRecommendation("brunch", {}, [], "");

      expect(result.title).toBe("AI Generated Outfit");
      expect(result.category).toBe("Casual");
      expect(result.moods).toEqual([]);
      expect(result.styleTags).toEqual([]);
      expect(result.toneHints).toEqual([]);
      expect(result.bodyHints).toEqual([]);
      expect(result.paletteLabels).toEqual([]);
      expect(result.hairstyle).toBe("Natural style");
      expect(result.outfit).toBe("Complete outfit description");
      expect(result.explanation).toBe("Personalized for you");
    });

    test("generateMultipleOutfits calls the Gemini API for every occasion", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "{}" }] } }],
        }),
      });

      const results = await aiOutfitService.generateMultipleOutfits(
        ["brunch", "gala"],
        {},
        []
      );

      expect(results).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test("generateChatResponse returns the Gemini text response directly", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Try a navy blazer with cream trousers." }] } }],
        }),
      });

      const reply = await aiOutfitService.generateChatResponse(
        "What should I wear to brunch?",
        { gender: "female", stylePreferences: ["minimal"] },
        [{ role: "user", content: "Hi" }, { role: "assistant", content: "Hello!" }],
        false
      );

      expect(reply).toBe("Try a navy blazer with cream trousers.");
    });

    test("generateChatResponse falls back to the heuristic reply when the Gemini call fails", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;

      const reply = await aiOutfitService.generateChatResponse("Help", {}, [], true);
      expect(reply).toMatch(/look I've put together/i);
    });

    test("analyzeImageForStyleProfile parses a well-formed Gemini JSON response", async () => {
      const stylePayload = {
        gender: "female",
        bodyType: "hourglass",
        skinTone: "olive",
        styleMood: "classic",
        stylePreferences: ["minimalist", "chic"],
      };

      mockFetchOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(stylePayload) }] } }],
        }),
      });

      const result = await aiOutfitService.analyzeImageForStyleProfile("base64imagedata", "image/png");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("generativelanguage.googleapis.com"),
        expect.objectContaining({ method: "POST" })
      );
      expect(result).toEqual(stylePayload);
    });

    test("analyzeImageForStyleProfile throws a wrapped error when the Gemini call fails", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("network unreachable")) as unknown as typeof fetch;

      await expect(
        aiOutfitService.analyzeImageForStyleProfile("base64imagedata")
      ).rejects.toThrow(/Failed to analyze image/);
    });

    test("analyzeImageForStyleProfile throws a wrapped error when the Gemini response is not ok", async () => {
      mockFetchOnce({
        ok: false,
        status: 500,
        text: async () => "internal error",
      });

      await expect(
        aiOutfitService.analyzeImageForStyleProfile("base64imagedata")
      ).rejects.toThrow(/Failed to analyze image/);
    });

    test("analyzeImageForStyleProfile throws a wrapped error when the response text is malformed JSON", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "not json" }] } }],
        }),
      });

      await expect(
        aiOutfitService.analyzeImageForStyleProfile("base64imagedata")
      ).rejects.toThrow(/Failed to analyze image/);
    });
  });
});

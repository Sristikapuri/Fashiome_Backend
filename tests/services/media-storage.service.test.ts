describe("media-storage.service", () => {
  const ORIGINAL_ENV = process.env;
  const SAMPLE_DATA_URL =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
    jest.resetModules();
  });

  describe("uploadDataUrl", () => {
    test("uploads to Cloudinary and returns the secure URL when configured", async () => {
      process.env.CLOUDINARY_CLOUD_NAME = "demo";
      process.env.CLOUDINARY_API_KEY = "key";
      process.env.CLOUDINARY_API_SECRET = "secret";
      jest.resetModules();

      const { uploadDataUrl } = require("../../src/services/media-storage.service");
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          secure_url: "https://res.cloudinary.com/demo/image/upload/x.png",
          public_id: "fashiome/ai/x",
        }),
      } as any);

      const result = await uploadDataUrl(SAMPLE_DATA_URL);

      expect(result.url).toBe("https://res.cloudinary.com/demo/image/upload/x.png");
      expect(result.publicId).toBe("fashiome/ai/x");
    });
  });
});

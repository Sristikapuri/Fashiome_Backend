import fs from "fs";
import path from "path";
import request from "supertest";


const ORIGINAL_GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ORIGINAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;
process.env.GEMINI_API_KEY = "";
process.env.OPENAI_API_KEY = "";


const mockGenerateOutfitRecommendation = jest.fn(async (occasion: string) => ({
  title: `Mocked ${occasion} Outfit`,
  occasion,
  category: "Casual",
  moods: ["Polished"],
  styleTags: ["minimal"],
  toneHints: ["warm"],
  bodyHints: ["balanced"],
  palette: [0xff000000],
  paletteLabels: ["black"],
  hairstyle: "Sleek bun",
  outfit: "Mocked outfit description",
  explanation: "Mocked explanation",
}));
const mockGenerateChatResponse = jest.fn(async () => "Mocked stylist reply");
const mockAnalyzeImageForStyleProfile = jest.fn(async () => ({
  gender: "female",
  bodyType: "hourglass",
  skinTone: "olive",
  styleMood: "classic",
  stylePreferences: ["minimal", "tailored"],
}));

jest.mock("../src/services/ai-outfit.service", () => ({
  aiOutfitService: {
    generateOutfitRecommendation: mockGenerateOutfitRecommendation,
    generateChatResponse: mockGenerateChatResponse,
    analyzeImageForStyleProfile: mockAnalyzeImageForStyleProfile,
  },
}));

const mockGenerateAndStoreOutfitImage = jest.fn(async () => "/uploads/mock-outfit.png");
jest.mock("../src/services/ai-image.service", () => ({
  aiImageService: {
    generateAndStoreOutfitImage: mockGenerateAndStoreOutfitImage,
  },
}));

import app from "../src/app";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";
import { createRegularUserAndToken } from "./setup/helpers";

const uploadsDir = path.join(__dirname, "../uploads");
const localImageFilename = "home-ai-test-reference.jpg";
const localImagePath = path.join(uploadsDir, localImageFilename);

beforeAll(async () => {
  await connectTestDatabase();
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(localImagePath, Buffer.from("fake-jpeg-bytes"));
}, 60_000);

afterEach(async () => {
  await clearTestDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await disconnectTestDatabase();
  if (fs.existsSync(localImagePath)) fs.unlinkSync(localImagePath);
  process.env.GEMINI_API_KEY = ORIGINAL_GEMINI_API_KEY;
  process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_API_KEY;
});

describe("GET /api/v1/home/dashboard", () => {
  test("rejects requests with no token (401)", async () => {
    const response = await request(app).get("/api/v1/home/dashboard");
    expect(response.status).toBe(401);
  });
});

describe("POST /api/v1/home/generate-outfit", () => {
  test("generates a recommendation for the requested occasion", async () => {
    const { token } = await createRegularUserAndToken();

    const response = await request(app)
      .post("/api/v1/home/generate-outfit")
      .set("Authorization", `Bearer ${token}`)
      .send({ occasion: "Party", profileData: { gender: "female" } });

    expect(response.status).toBe(200);
    expect(response.body.responseData.title).toBe("Mocked Party Outfit");
    expect(response.body.responseData.occasion).toBe("Party");
    expect(response.body.responseData.matchedProducts).toEqual([]);
  });
});

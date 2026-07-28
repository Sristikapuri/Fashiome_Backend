import { Router } from "express";
import fs from "fs";
import path from "path";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { WardrobeCollectionModel } from "../models/wardrobe.model";
import { ClothesModel, ClothingCategory } from "../models/clothes.model";
import { GEMINI_API_KEY } from "../configs/constant";
import mongoose from "mongoose";
import { aiOutfitService } from "../services/ai-outfit.service";
import { aiImageService } from "../services/ai-image.service";

const router = Router();
const uploadsDir = path.join(__dirname, "../../uploads");

async function callGeminiAPI(prompt: string, systemInstruction?: string, responseMimeType?: string, temperature?: number): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not defined.");
    throw new Error("API Key Missing");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    ...(systemInstruction ? {
      systemInstruction: {
        parts: [
          {
            text: systemInstruction
          }
        ]
      }
    } : {}),
    generationConfig: {
      ...(responseMimeType ? { responseMimeType } : {}),
      temperature: typeof temperature === "number" ? temperature : 1.0
    }
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API returned status ${res.status}: ${errText}`);
    }

    const data = await res.json() as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No response text returned from Gemini API");
    }

    return text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

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

type Recommendation = {
  id: string;
  title: string;
  occasion: string;
  category: string;
  mood: string;
  imageUrl: string;
  outfit: string;
  hairstyle: string;
  explanation: string;
  palette: number[];
  paletteLabels: string[];
  wardrobeItemsUsed?: string[];
  missingItemsToBuy?: string[];
  matchedProducts?: MatchedShopItem[];
};

type MatchedShopItem = {
  _id: string;
  name: string;
  category: ClothingCategory;
  size: string;
  color: string;
  price: number;
  discountedPrice?: number | null;
  stock: number;
  imageUrl?: string;
  description?: string;
  matchReason: string;
};

type OutfitCandidate = {
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
  imageUrl: string;
};

const trendPrompts = [
  ["Soft Tailoring", "Trending", "Fluid neutral tailoring with a polished silhouette."],
  ["Modern Evening", "Celebrity", "Minimal glamour with clean lines and refined evening styling."],
  ["Traditional Layers", "Traditional", "Rich South Asian textures and layered styling with a refined finish."],
  ["Night Street", "Trending", "Dark layers and confident proportions for an editorial streetwear look."],
  ["Retro Knit", "Minimal", "Warm knit textures with a contemporary throwback mood."],
  ["Color Story", "Color Guide", "An elevated wearable outfit built around a striking editorial palette."],
] as const;

let trendCache: { daySeed: number; items: Array<Record<string, unknown>> } | null = null;

async function buildDailyTrendLooks() {
  const daySeed = Math.floor(Date.now() / 86_400_000);
  if (trendCache?.daySeed === daySeed) return trendCache.items;

  const items = await Promise.all(
    trendPrompts.map(async ([title, category, caption], index) => {
      let imageUrl = "";
      try {
        imageUrl = await aiImageService.generateAndStoreOutfitImage(
          `${caption} Professional fashion editorial photography, no text, clean studio composition.`,
          uploadsDir,
          "photorealistic"
        );
      } catch (error) {
        console.error(`Failed to generate trend image for "${title}":`, error);
      }
      return {
        id: `ai-trend-${daySeed}-${index}`,
        title,
        category,
        imageUrl,
        caption,
        height: 196 + ((index * 17) % 58),
      };
    })
  );

  trendCache = { daySeed, items };
  return items;
}

function normalizeOccasion(value = ""): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("wedding") || normalized.includes("sangeet")) return "Wedding";
  if (normalized.includes("party") || normalized.includes("gala")) return "Party";
  if (normalized.includes("office") || normalized.includes("work")) return "Office";
  if (normalized.includes("travel")) return "Travel";
  if (normalized.includes("date")) return "Date Night";
  if (normalized.includes("festival")) return "Festival";
  if (normalized.includes("formal") || normalized.includes("black tie") || normalized.includes("blacktie")) return "Formal";
  if (normalized.includes("casual") || normalized.includes("beach") || normalized.includes("brunch") || normalized.includes("street")) return "Casual";
  return "Weekend";
}

function includesAny(source: string, values: string[]): boolean {
  const normalized = source.toLowerCase();
  return values.some((value) => normalized.includes(value.toLowerCase()));
}

function buildProfileSummary(profile: StyleProfile): string {
  const parts = [
    profile.gender ? `${profile.gender.toLowerCase()} user` : "",
    profile.height ? `${profile.height} cm` : "",
    profile.weight ? `${profile.weight} kg` : "",
    profile.skinTone ? `${profile.skinTone.toLowerCase()} skin tone` : "",
    profile.bodyType ? `${profile.bodyType.toLowerCase()} body type` : "",
    profile.faceShape ? `${profile.faceShape.toLowerCase()} face shape` : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "your current style profile";
}

function normalizeText(value = "") {
  return value.toLowerCase().trim();
}

function summarizeWardrobeItems(items: WardrobeSummaryItem[] = []) {
  return items.slice(0, 12).map((item) => ({
    id: item.id,
    title: item.title || item.tag || "Wardrobe item",
    category: item.category || "Unknown",
    tag: item.tag || "",
    imageUrl: item.imageUrl || "",
    outfit: item.outfit || "",
    hairstyle: item.hairstyle || "",
    explanation: item.explanation || "",
    paletteLabels: item.paletteLabels || [],
    isFavorite: Boolean(item.isFavorite),
    entryType: item.entryType || "look",
  }));
}

function extractWardrobeCoverage(wardrobeItems: WardrobeSummaryItem[], recommendation: OutfitCandidate) {
  const wardrobeText = normalizeText(
    wardrobeItems
      .map((item) => `${item.title || ""} ${item.category || ""} ${item.tag || ""} ${item.explanation || ""}`)
      .join(" ")
  );
  const desiredCategories = extractDesiredCategories(recommendation);
  const used: string[] = [];
  const missing: string[] = [];

  desiredCategories.forEach((category) => {
    if (wardrobeText.includes(category)) {
      used.push(category);
    } else {
      missing.push(category);
    }
  });

  wardrobeItems.forEach((item) => {
    const itemLabel = item.title || item.tag || item.category;
    if (itemLabel && recommendation.outfit.toLowerCase().includes(normalizeText(itemLabel))) {
      used.push(itemLabel);
    }
  });

  return {
    wardrobeItemsUsed: [...new Set(used)].slice(0, 4),
    missingItemsToBuy: [...new Set(missing)].slice(0, 4),
  };
}

function extractDesiredCategories(recommendation: OutfitCandidate) {
  const source = normalizeText(
    `${recommendation.title} ${recommendation.outfit} ${recommendation.explanation}`
  );
  const categories = new Set<MatchedShopItem["category"]>();

  if (/(blazer|shirt|top|tee|camisole|corset|knit|cardigan|overshirt|jacket)/.test(source)) {
    categories.add("tops");
  }
  if (/(trouser|trousers|skirt|denim|jeans|pants|bottom)/.test(source)) {
    categories.add("bottoms");
  }
  if (/(heel|heels|loafer|loafers|sneaker|sneakers|boot|boots|sandal|sandals|pump|pumps)/.test(source)) {
    categories.add("shoes");
  }
  if (/(earring|earrings|bag|tote|clutch|jewelry|accessor)/.test(source)) {
    categories.add("accessories");
  }

  if (categories.size === 0) {
    [
      "tops",
      "bottoms",
      "shoes",
      "accessories",
      "dresses",
      "outerwear",
      "shirts",
      "sweaters",
      "pants",
      "skirts",
      "activewear",
    ].forEach((item) => categories.add(item as MatchedShopItem["category"]));
  }

  return [...categories];
}

function scoreShopItem(item: any, recommendation: OutfitCandidate) {
  const source = normalizeText(
    `${recommendation.title} ${recommendation.occasion} ${recommendation.category} ${recommendation.outfit} ${recommendation.explanation} ${recommendation.paletteLabels.join(" ")} ${recommendation.styleTags.join(" ")}`
  );
  const itemSource = normalizeText(
    `${item.name} ${item.category} ${item.color} ${item.description || ""}`
  );
  let score = 0;

  if (source.includes(normalizeText(item.color || ""))) {
    score += 6;
  }

  if (recommendation.paletteLabels.some((label) => normalizeText(label).includes(normalizeText(item.color || "")) || normalizeText(item.color || "").includes(normalizeText(label)))) {
    score += 5;
  }

  if (extractDesiredCategories(recommendation).includes(item.category)) {
    score += 4;
  }

  recommendation.styleTags.forEach((tag) => {
    if (itemSource.includes(normalizeText(tag))) {
      score += 2;
    }
  });

  recommendation.moods.forEach((mood) => {
    if (itemSource.includes(normalizeText(mood))) {
      score += 1;
    }
  });

  if (item.discountedPrice !== null && item.discountedPrice !== undefined) {
    score += 1;
  }

  if ((item.stock || 0) > 0) {
    score += 1;
  }

  return score;
}

function buildMatchReason(item: any, recommendation: OutfitCandidate) {
  const reasons: string[] = [];
  const desiredCategories = extractDesiredCategories(recommendation);
  const normalizedColor = normalizeText(item.color || "");

  if (
    recommendation.paletteLabels.some((label) => normalizeText(label).includes(normalizedColor) || normalizedColor.includes(normalizeText(label)))
  ) {
    reasons.push(`Matches the ${item.color} color story`);
  }

  if (desiredCategories.includes(item.category)) {
    reasons.push(`Fits the ${item.category} layer in this look`);
  }

  if (reasons.length === 0) {
    reasons.push(`Works with the ${recommendation.occasion.toLowerCase()} styling direction`);
  }

  return reasons[0];
}

async function findMatchedShopItems(recommendation: OutfitCandidate, userGender?: string): Promise<MatchedShopItem[]> {
  const query: any = { status: "active", stock: { $gt: 0 } };
  
  if (userGender === "female" || userGender === "male") {
    query.gender = { $in: [userGender, "unisex"] };
  }

  const items = await ClothesModel.find(query)
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();

  if (!items.length) {
    return [];
  }

  const desiredCategories = extractDesiredCategories(recommendation);
  const ranked = items
    .map((item) => ({
      item,
      score: scoreShopItem(item, recommendation),
    }))
    .sort((left, right) => right.score - left.score);

  const selected: typeof ranked = [];
  const seenCategories = new Set<string>();

  for (const entry of ranked) {
    if (selected.length >= 4) break;
    if (entry.score <= 0) continue;
    if (desiredCategories.includes(entry.item.category as MatchedShopItem["category"]) && !seenCategories.has(entry.item.category)) {
      selected.push(entry);
      seenCategories.add(entry.item.category);
    }
  }

  for (const entry of ranked) {
    if (selected.length >= 4) break;
    if (entry.score <= 0) continue;
    if (selected.some((selectedEntry) => String(selectedEntry.item._id) === String(entry.item._id))) {
      continue;
    }
    selected.push(entry);
  }

  return selected.map(({ item }) => ({
    _id: String(item._id),
    name: item.name,
    category: item.category,
    size: item.size,
    color: item.color,
    price: item.price,
    discountedPrice: item.discountedPrice ?? null,
    stock: item.stock,
    imageUrl: item.imageUrl,
    description: item.description,
    matchReason: buildMatchReason(item, recommendation),
  }));
}

function scoreCandidate(
  candidate: OutfitCandidate,
  profile: StyleProfile,
  occasion: string,
  preferenceScores: Record<string, number>,
  source: string
): number {
  let score = candidate.occasion === occasion ? 12 : 0;

  const mood = (profile.styleMood || "").toLowerCase();
  if (mood && includesAny(mood, candidate.moods)) {
    score += 5;
  }

  const preferences = (profile.stylePreferences || []).join(" ").toLowerCase();
  if (preferences && includesAny(preferences, candidate.styleTags)) {
    score += 4;
  }

  const skinTone = (profile.skinTone || "").toLowerCase();
  if (skinTone && includesAny(skinTone, candidate.toneHints)) {
    score += 3;
  }

  const bodyType = (profile.bodyType || "").toLowerCase();
  if (bodyType && includesAny(bodyType, candidate.bodyHints)) {
    score += 2;
  }

  score += preferenceScores[candidate.category] ?? 0;

  if (source.toLowerCase().includes("wardrobe")) {
    if (candidate.styleTags.includes("tailored") || candidate.styleTags.includes("minimal")) {
      score += 1;
    }
  } else {
    if (candidate.styleTags.includes("statement") || candidate.styleTags.includes("bold")) {
      score += 1;
    }
  }

  return score;
}

 async function buildRecommendation(
  profile: StyleProfile,
  occasionInput = "Weekend",
  preferenceScores: Record<string, number> = {},
  source = "My Wardrobe",
  imageReference?: string,
  styleRequest?: string,
  wardrobeItems: WardrobeSummaryItem[] = []
): Promise<Recommendation> {
  // Every recommendation is generated from the current request and profile.
  // The catalog is used only to match purchasable pieces after generation.
  const generatedOutfit = await aiOutfitService.generateOutfitRecommendation(
    occasionInput,
    profile,
    wardrobeItems,
    styleRequest || occasionInput
  );

    const mood = profile.styleMood || generatedOutfit.moods[0] || "Polished";
    const referenceNote = imageReference
      ? " The outfit image was generated from your uploaded reference photo and used as the styling anchor for this direction."
      : "";

    const userGender = (profile.gender || "").toLowerCase();

    const tempCandidate: OutfitCandidate = {
      title: generatedOutfit.title,
      occasion: occasionInput,
      category: generatedOutfit.category,
      moods: generatedOutfit.moods,
      styleTags: generatedOutfit.styleTags,
      toneHints: generatedOutfit.toneHints,
      bodyHints: generatedOutfit.bodyHints,
      palette: generatedOutfit.palette,
      paletteLabels: generatedOutfit.paletteLabels,
      hairstyle: generatedOutfit.hairstyle,
      outfit: generatedOutfit.outfit,
      explanation: generatedOutfit.explanation,
      imageUrl: "",
    };
    const matchedProducts = await findMatchedShopItems(tempCandidate, userGender);

    const referenceInstruction = imageReference
      ? " Use the user's uploaded reference image as a style anchor; preserve its relevant level of formality, silhouette, and aesthetic while creating a new outfit."
      : "";
    const imagePrompt = `${generatedOutfit.outfit} for ${occasionInput}. ${generatedOutfit.explanation}.${referenceInstruction}`;
    let generatedImageUrl = "";
    try {
      generatedImageUrl = await aiImageService.generateAndStoreOutfitImage(
        imagePrompt,
        uploadsDir,
        "photorealistic"
      );
    } catch (error) {
      console.error("Failed to generate outfit image:", error);
    }

    const wardrobeCoverage = extractWardrobeCoverage(wardrobeItems, {
      title: generatedOutfit.title,
      occasion: occasionInput,
      category: generatedOutfit.category,
      moods: generatedOutfit.moods,
      styleTags: generatedOutfit.styleTags,
      toneHints: generatedOutfit.toneHints,
      bodyHints: generatedOutfit.bodyHints,
      palette: generatedOutfit.palette,
      paletteLabels: generatedOutfit.paletteLabels,
      hairstyle: generatedOutfit.hairstyle,
      outfit: generatedOutfit.outfit,
      explanation: generatedOutfit.explanation,
      imageUrl: generatedImageUrl,
    });

    return {
      id: `ai-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: generatedOutfit.title,
      occasion: occasionInput,
      category: generatedOutfit.category,
      mood,
      imageUrl: generatedImageUrl,
      outfit: generatedOutfit.outfit,
      hairstyle: generatedOutfit.hairstyle,
      explanation: `${generatedOutfit.explanation}${referenceNote}`,
      palette: generatedOutfit.palette,
      paletteLabels: generatedOutfit.paletteLabels,
      wardrobeItemsUsed: wardrobeCoverage.wardrobeItemsUsed,
      missingItemsToBuy: wardrobeCoverage.missingItemsToBuy,
      matchedProducts,
    };
}

async function readUploadedImage(imageReference = "") {
  if (/^https?:\/\//i.test(imageReference)) {
    const response = await fetch(imageReference);
    if (!response.ok) throw new Error("Uploaded image could not be downloaded. Please upload it again.");
    const contentType = response.headers.get("content-type") || "image/jpeg";
    return {
      imageReference,
      mimeType: contentType.split(";")[0],
      imageBase64: Buffer.from(await response.arrayBuffer()).toString("base64"),
    };
  }
  const normalizedReference = imageReference.split("?")[0];
  const safeName = path.basename(normalizedReference);
  const sourcePath = path.join(uploadsDir, safeName);
  if (!safeName || !fs.existsSync(sourcePath)) {
    throw new Error("Uploaded image was not found. Please upload the image again.");
  }

  const extension = path.extname(safeName).toLowerCase();
  const mimeType = extension === ".png"
    ? "image/png"
    : extension === ".webp"
      ? "image/webp"
      : "image/jpeg";

  return {
    imageReference,
    mimeType,
    imageBase64: fs.readFileSync(sourcePath).toString("base64"),
  };
}

async function analyzeUploadedProfile(
  profile: StyleProfile,
  imageReference = ""
): Promise<StyleProfile> {
  const image = await readUploadedImage(imageReference);
  const detectedProfile = await aiOutfitService.analyzeImageForStyleProfile(
    image.imageBase64,
    image.mimeType
  );

  return {
    ...profile,
    ...detectedProfile,
    stylePreferences:
      detectedProfile.stylePreferences?.length
        ? detectedProfile.stylePreferences
        : profile.stylePreferences,
  };
}

function inferOccasionFromMessage(message: string): string | null {
  const normalized = message.toLowerCase();
  if (normalized.includes("wedding")) return "Wedding";
  if (normalized.includes("office") || normalized.includes("work")) return "Office";
  if (normalized.includes("party")) return "Party";
  if (normalized.includes("travel")) return "Travel";
  if (normalized.includes("date")) return "Date Night";
  if (normalized.includes("festival")) return "Festival";
  if (normalized.includes("formal")) return "Formal";
  if (normalized.includes("casual")) return "Casual";
  if (normalized.includes("weekend")) return "Weekend";
  return null;
}

type AssistantIntent = {
  wantsRecommendation: boolean;
  occasion: string;
  styleRequest: string;
};

function inferAssistantIntentHeuristically(message: string): AssistantIntent {
  const normalized = message.trim().toLowerCase();
  const fashionPattern =
    /(outfit|wear|style me|styling|look for|look idea|dress me|what should i wear|what to wear|recommend.*look|recommend.*outfit|help me style|build me a look|put together a look|color palette|colou?r palette|hairstyle|hair style|fit advice|wardrobe|party|wedding|office|date night|festival|formal|casual|vacation|holiday|airport|travel|brunch|beach|dinner|meeting|interview)/i;

  return {
    wantsRecommendation: fashionPattern.test(normalized),
    occasion: inferOccasionFromMessage(normalized) || normalized || "Weekend",
    styleRequest: message.trim(),
  };
}

async function inferAssistantIntent(message: string): Promise<AssistantIntent> {
  const heuristic = inferAssistantIntentHeuristically(message);

  try {
    const text = await callGeminiAPI(
      `Classify this user message for a fashion styling assistant.

User message:
"${message.trim()}"

Return ONLY raw JSON in this exact shape:
{
  "wantsRecommendation": true,
  "occasion": "short occasion label",
  "styleRequest": "brief restatement of the user's styling request"
}

Set "wantsRecommendation" to true when the user is asking for an outfit, style direction, color guidance, hairstyle guidance, or anything they should wear.
Set it to false for general conversation, identity questions, chit-chat, or unrelated knowledge questions.
If unsure, preserve the user's wording in "styleRequest".`,
      "You classify requests for a fashion styling assistant and output strict JSON only.",
      "application/json",
      0.2
    );

    const parsed = JSON.parse(text.trim()) as Partial<AssistantIntent>;
    return {
      wantsRecommendation:
        typeof parsed.wantsRecommendation === "boolean"
          ? parsed.wantsRecommendation
          : heuristic.wantsRecommendation,
      occasion:
        typeof parsed.occasion === "string" && parsed.occasion.trim()
          ? parsed.occasion.trim()
          : heuristic.occasion,
      styleRequest:
        typeof parsed.styleRequest === "string" && parsed.styleRequest.trim()
          ? parsed.styleRequest.trim()
          : heuristic.styleRequest,
    };
  } catch (error) {
    console.error("Assistant intent inference failed, using heuristics:", error);
    return heuristic;
  }
}

async function buildAssistantReply({
  message,
  profile,
  currentRecommendation,
  preferenceScores,
  source,
  wardrobeItems = [],
}: {
  message: string;
  profile: StyleProfile;
  currentRecommendation?: Partial<Recommendation>;
  preferenceScores?: Record<string, number>;
  source?: string;
  wardrobeItems?: WardrobeSummaryItem[];
}) {
  const normalizedMessage = message.trim();
  const intent = normalizedMessage
    ? await inferAssistantIntent(normalizedMessage)
    : {
        wantsRecommendation: false,
        occasion: "Weekend",
        styleRequest: "",
      };
  let recommendation: Recommendation | undefined;

  if (intent.wantsRecommendation) {
    recommendation = await buildRecommendation(
      profile,
      intent.occasion || normalizedMessage,
      preferenceScores || {},
      source || "My Wardrobe",
      undefined,
      intent.styleRequest || normalizedMessage,
      wardrobeItems
    );
  }

  const promptSections = [
    `User message: "${normalizedMessage || "Help me start with fashion styling."}"`,
    currentRecommendation
      ? `Current recommendation context:
- Title: ${currentRecommendation.title || "Not specified"}
- Outfit: ${currentRecommendation.outfit || "Not specified"}
- Hairstyle: ${currentRecommendation.hairstyle || "Not specified"}
- Palette: ${Array.isArray(currentRecommendation.paletteLabels) ? currentRecommendation.paletteLabels.join(", ") : "Not specified"}`
      : "",
    recommendation
      ? `Fresh occasion recommendation:
- Occasion: ${recommendation.occasion}
- Title: ${recommendation.title}
- Outfit: ${recommendation.outfit}
- Hairstyle: ${recommendation.hairstyle}
- Palette: ${recommendation.paletteLabels.join(", ")}
- Explanation: ${recommendation.explanation}
- Wardrobe Items Used: ${(recommendation.wardrobeItemsUsed || []).join(", ") || "None"}
- Missing Items To Buy: ${(recommendation.missingItemsToBuy || []).join(", ") || "None"}`
      : "",
    intent.wantsRecommendation
      ? "The user is asking for styling help. Present the recommendation naturally and confidently."
      : "The user is not asking for an outfit card. Answer naturally and helpfully.",
  ].filter(Boolean);

  const reply = await aiOutfitService.generateChatResponse(
    promptSections.join("\n\n"),
    profile
  );

  return {
    // Keep both keys during the client migration; web and Flutter can share
    // the same endpoint without guessing which response contract is active.
    reply,
    text: reply,
    wantsRecommendation: intent.wantsRecommendation,
    occasion: intent.occasion,
    styleRequest: intent.styleRequest,
    recommendation,
  };
}


router.get("/dashboard", authorizedMiddleware, async (req, res) => {
  const userId = (req as any).user?._id?.toString() || (req as any).user?.id || (req as any).user?.userId;
  const profile = (req.query as StyleProfile) || {};
  const wardrobe = await WardrobeCollectionModel.findOne({ userId }).lean();
  const recommendation = await buildRecommendation(
    profile,
    "Weekend",
    {},
    "My Wardrobe",
    undefined,
    "Weekend style of the day",
    wardrobe?.items ?? []
  );
  return ApiResponseHelper.success(
    res,
    {
      aiStyleOfDay: recommendation,
      recommendations: [recommendation],
    },
    "Dashboard generated successfully"
  );
});

router.get("/trends", authorizedMiddleware, async (_req, res) => {
  return ApiResponseHelper.success(
    res,
    await buildDailyTrendLooks(),
    "Trends retrieved successfully"
  );
});

router.post("/generate-outfit", authorizedMiddleware, async (req, res) => {
  const {
    occasion = "Weekend",
    profileData = {},
    preferenceScores = {},
    source = "My Wardrobe",
    imageReference,
  } = req.body || {};
  const userId = (req as any).user?._id?.toString() || (req as any).user?.id || (req as any).user?.userId;
  const wardrobe = await WardrobeCollectionModel.findOne({ userId }).lean();

  const recommendation = await buildRecommendation(
    profileData,
    occasion,
    preferenceScores,
    source,
    imageReference,
    occasion,
    wardrobe?.items ?? []
  );

  return ApiResponseHelper.success(
    res,
    recommendation,
    "Outfit recommendation generated successfully"
  );
});

router.post("/assistant-chat", authorizedMiddleware, async (req, res) => {
  const {
    message = "",
    profileData = {},
    currentRecommendation,
    preferenceScores = {},
    source = "My Wardrobe",
  } = req.body || {};
  const userId = (req as any).user?._id?.toString() || (req as any).user?.id || (req as any).user?.userId;
  const wardrobe = await WardrobeCollectionModel.findOne({ userId }).lean();

  try {
    const result = await buildAssistantReply({
      message,
      profile: profileData,
      currentRecommendation,
      preferenceScores,
      source,
      wardrobeItems: wardrobe?.items ?? [],
    });

    return ApiResponseHelper.success(
      res,
      result,
      "Assistant reply generated successfully"
    );
  } catch (error) {
    console.error("Assistant chat failed:", error);
    return ApiResponseHelper.error(
      res,
      "The AI styling assistant is temporarily unavailable. Please try again in a moment.",
      502
    );
  }
});

router.post("/search", authorizedMiddleware, async (req, res) => {
  const userId = (req as any).user?._id?.toString() || (req as any).user?.id || (req as any).user?.userId;
  const query = (req.body?.query || "").toString().trim().toLowerCase();
  const profileData = req.body?.profileData || {};
  const preferenceScores = req.body?.preferenceScores || {};
  const wardrobe = await WardrobeCollectionModel.findOne({ userId }).lean();

  const matches = (...values: unknown[]) => {
    if (!query) return true;
    return values.some((value) =>
      String(value || "").toLowerCase().includes(query)
    );
  };

  const liveTrends = await buildDailyTrendLooks();
  const discoverItems = liveTrends.filter((item) =>
    matches(item.title, item.category, item.caption)
  );
  const wardrobeItems = (wardrobe?.items ?? []).filter((item: any) =>
    matches(item.title, item.category, item.tag, item.outfit, item.explanation)
  );
  const recommendation = await buildRecommendation(
    profileData,
    query || "Weekend",
    preferenceScores,
    "Search",
    undefined,
    query,
    wardrobe?.items ?? []
  );

  return ApiResponseHelper.success(
    res,
    {
      query,
      discoverItems: discoverItems.length > 0 ? discoverItems : liveTrends,
      wardrobeItems,
      recommendation,
    },
    "Search completed successfully"
  );
});

router.get("/wardrobe", authorizedMiddleware, async (req, res) => {
  const userId = (req as any).user?._id?.toString() || (req as any).user?.id || (req as any).user?.userId;
  const wardrobe = await WardrobeCollectionModel.findOne({ userId }).lean();

  return ApiResponseHelper.success(
    res,
    wardrobe?.items ?? [],
    "Wardrobe retrieved successfully"
  );
});

router.post("/wardrobe", authorizedMiddleware, async (req, res) => {
  const userId = (req as any).user?._id?.toString() || (req as any).user?.id || (req as any).user?.userId;
  const item = req.body || {};
  const itemId = item.id || `${Date.now()}`;

  const wardrobe = await WardrobeCollectionModel.findOneAndUpdate(
    { userId },
    {
      $pull: { items: { id: itemId } },
      $setOnInsert: { userId },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  wardrobe.items.unshift({
    ...item,
    id: itemId,
    savedAt: item.savedAt || new Date().toISOString(),
  });
  await wardrobe.save();

  return ApiResponseHelper.success(
    res,
    wardrobe.items[0],
    "Wardrobe item added successfully"
  );
});

router.post("/wardrobe/sync", authorizedMiddleware, async (req, res) => {
  const userId = (req as any).user?._id?.toString() || (req as any).user?.id || (req as any).user?.userId;
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  await WardrobeCollectionModel.findOneAndUpdate(
    { userId },
    { userId, items },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  return ApiResponseHelper.success(
    res,
    { count: items.length },
    "Wardrobe synced successfully"
  );
});

router.patch("/wardrobe/:itemId", authorizedMiddleware, async (req, res) => {
  const userId = (req as any).user?._id?.toString() || (req as any).user?.id || (req as any).user?.userId;
  const { itemId } = req.params;
  const updates = req.body || {};

  const wardrobe = await WardrobeCollectionModel.findOne({ userId });
  if (!wardrobe) {
    return ApiResponseHelper.success(res, null, "Wardrobe item not found");
  }

  const itemIndex = wardrobe.items.findIndex((item) => item.id === itemId);
  if (itemIndex === -1) {
    return ApiResponseHelper.success(res, null, "Wardrobe item not found");
  }

  Object.assign(wardrobe.items[itemIndex], updates, { id: itemId });
  await wardrobe.save();

  return ApiResponseHelper.success(
    res,
    wardrobe.items[itemIndex],
    "Wardrobe item updated successfully"
  );
});

router.delete("/wardrobe/:itemId", authorizedMiddleware, async (req, res) => {
  const userId = (req as any).user?._id?.toString() || (req as any).user?.id || (req as any).user?.userId;
  const { itemId } = req.params;

  const wardrobe = await WardrobeCollectionModel.findOneAndUpdate(
    { userId },
    { $pull: { items: { id: itemId } } },
    { returnDocument: 'after' }
  );

  return ApiResponseHelper.success(
    res,
    { count: wardrobe?.items.length ?? 0 },
    "Wardrobe item deleted successfully"
  );
});

router.post("/generate-profile", authorizedMiddleware, async (req, res) => {
  const userId = (req as any).user?._id?.toString() || (req as any).user?.id || (req as any).user?.userId;
  const profile = req.body?.profileData || {};
  const imageReference = req.body?.imageReference || "";
  const occasion = req.body?.occasion || "Weekend";
  const preferenceScores = req.body?.preferenceScores || {};
  const source = req.body?.source || "Uploaded Reference";
  const wardrobe = await WardrobeCollectionModel.findOne({ userId }).lean();
  try {
    const generatedProfile = await analyzeUploadedProfile(profile, imageReference);
    const recommendation = await buildRecommendation(
      generatedProfile,
      occasion,
      preferenceScores,
      source,
      imageReference,
      occasion,
      wardrobe?.items ?? []
    );

    return ApiResponseHelper.success(
      res,
      {
        profileData: generatedProfile,
        recommendation,
        summary: `AI profile analysis ready for ${buildProfileSummary(generatedProfile)}.`,
      },
      "Profile generated successfully"
    );
  } catch (error) {
    console.error("AI profile generation failed:", error);
    return ApiResponseHelper.error(
      res,
      "The AI profile analyzer is temporarily unavailable. Please try again.",
      502
    );
  }
});

export default router;

import { Router } from "express";
import fs from "fs";
import path from "path";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { WardrobeCollectionModel } from "../models/wardrobe.model";
import { ClothesModel, ClothingCategory } from "../models/clothes.model";
import { GEMINI_API_KEY } from "../configs/constant";
import mongoose from "mongoose";

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

const outfitCatalog: OutfitCandidate[] = [
  {
    title: "Wedding Tailored Ivory",
    occasion: "Wedding",
    category: "Formal",
    moods: ["editorial", "elegant", "refined", "polished"],
    styleTags: ["tailored", "minimal", "neutral", "formal"],
    toneHints: ["warm", "neutral", "olive"],
    bodyHints: ["balanced", "athletic", "pear", "rectangle"],
    palette: [0xfff4ead8, 0xffd5b38a, 0xff8c6d54, 0xff37443a],
    paletteLabels: ["Ivory", "Champagne", "Cocoa", "Olive"],
    hairstyle: "Sleek low bun with soft face-framing pieces.",
    outfit:
      "Ivory structured blazer, satin camisole, tailored wide-leg trousers, gold earrings, and pointed heels.",
    explanation:
      "This look keeps the silhouette formal and lengthened while using warm neutrals that photograph beautifully at wedding events.",
    imageUrl: "assets/images/ai_wedding_formal.jpg",
  },
  {
    title: "Office Soft Power Suit",
    occasion: "Office",
    category: "Formal",
    moods: ["polished", "minimal", "smart", "clean"],
    styleTags: ["tailored", "office", "smart", "neutral"],
    toneHints: ["cool", "neutral", "deep"],
    bodyHints: ["rectangle", "petite", "balanced", "hourglass"],
    palette: [0xffd9dde5, 0xff7d8ca3, 0xff2d3748, 0xfff4efe8],
    paletteLabels: ["Pearl", "Slate Blue", "Navy", "Soft White"],
    hairstyle: "Smooth blowout with a side part.",
    outfit:
      "Slate blazer, soft ivory knit top, ankle-length trousers, structured tote, and clean leather loafers.",
    explanation:
      "The outfit is office-ready, sharp on video calls, and easy to repeat with small accessory swaps through the week.",
    imageUrl: "assets/images/outfit.jpg",
  },
  {
    title: "Evening Statement Set",
    occasion: "Party",
    category: "Party",
    moods: ["bold", "glam", "confident", "night"],
    styleTags: ["party", "sleek", "statement", "night out"],
    toneHints: ["deep", "neutral", "olive"],
    bodyHints: ["hourglass", "athletic", "balanced"],
    palette: [0xff1d1d1d, 0xff7a2147, 0xffd5a56b, 0xfff3d8d8],
    paletteLabels: ["Black", "Berry", "Gold", "Rose"],
    hairstyle: "Glossy waves tucked behind one ear.",
    outfit:
      "Black structured corset top, high-waist tailored trousers, metallic heels, statement earrings, and a compact clutch.",
    explanation:
      "The contrast between a sharp base and glam accents makes the outfit feel event-ready without looking costume-like.",
    imageUrl: "assets/images/party.jpg",
  },
  {
    title: "Travel Smart Layers",
    occasion: "Travel",
    category: "Casual",
    moods: ["relaxed", "smart", "soft luxe", "comfortable"],
    styleTags: ["travel", "casual", "layered", "practical"],
    toneHints: ["warm", "olive", "neutral"],
    bodyHints: ["balanced", "petite", "rectangle", "pear"],
    palette: [0xffe9decb, 0xff9b7d58, 0xff6e7b56, 0xff2d3640],
    paletteLabels: ["Stone", "Camel", "Sage", "Charcoal"],
    hairstyle: "Low textured ponytail or smooth tuck-behind-ear style.",
    outfit:
      "Relaxed overshirt, ribbed tee, straight-leg trousers, white sneakers, and a roomy crossbody bag.",
    explanation:
      "It prioritizes movement and layering, so you stay comfortable in transit while still looking put together.",
    imageUrl: "assets/images/travel.jpg",
  },
  {
    title: "Weekend Chic Denim",
    occasion: "Weekend",
    category: "Smart",
    moods: ["casual", "clean", "minimal", "relaxed"],
    styleTags: ["weekend", "smart", "minimal", "denim"],
    toneHints: ["neutral", "cool", "warm"],
    bodyHints: ["balanced", "rectangle", "hourglass", "pear"],
    palette: [0xfff7f1ea, 0xff8ba4c4, 0xff6a5847, 0xff1d1d1d],
    paletteLabels: ["Cream", "Soft Blue", "Taupe", "Black"],
    hairstyle: "Loose natural texture with a polished finish.",
    outfit:
      "Cream fitted knit, straight blue denim, cropped jacket, ankle boots, and a structured shoulder bag.",
    explanation:
      "The proportions keep it relaxed enough for daytime while the tailored outer layer makes it feel intentional.",
    imageUrl: "assets/images/weekend.jpg",
  },
  {
    title: "Date Night Satin Contrast",
    occasion: "Date Night",
    category: "Elegant",
    moods: ["romantic", "elegant", "soft", "confident"],
    styleTags: ["date", "romantic", "elegant", "soft"],
    toneHints: ["warm", "deep", "neutral"],
    bodyHints: ["hourglass", "pear", "balanced", "petite"],
    palette: [0xff301f2f, 0xffd8b7c3, 0xfff3ebe4, 0xff8c5f4d],
    paletteLabels: ["Plum", "Blush", "Porcelain", "Mocha"],
    hairstyle: "Soft glam waves or a sleek tucked bob.",
    outfit:
      "Slip midi skirt, fitted knit top, cropped blazer, delicate jewelry, and heeled sandals.",
    explanation:
      "This outfit balances softness and structure, giving you a date-night look that feels refined rather than overdone.",
    imageUrl: "assets/images/brunch.jpg",
  },
  {
    title: "Festival Modern Layering",
    occasion: "Festival",
    category: "Bold",
    moods: ["creative", "bold", "playful", "street"],
    styleTags: ["festival", "bold", "streetwear", "layered"],
    toneHints: ["deep", "olive", "warm"],
    bodyHints: ["athletic", "rectangle", "balanced"],
    palette: [0xffc76a32, 0xff243447, 0xfff2d2a9, 0xff5b7b5d],
    paletteLabels: ["Burnt Orange", "Midnight", "Sand", "Moss"],
    hairstyle: "Braided ponytail or textured half-up style.",
    outfit:
      "Graphic fitted top, statement overshirt, utility trousers, chunky boots, and layered accessories.",
    explanation:
      "The look has enough personality for festival styling while staying grounded with wearable layers and durable footwear.",
    imageUrl: "assets/images/wedding.jpg",
  },
  {
    title: "Formal Monochrome Edit",
    occasion: "Formal",
    category: "Formal",
    moods: ["polished", "formal", "minimal", "clean"],
    styleTags: ["formal", "monochrome", "tailored", "sharp"],
    toneHints: ["cool", "neutral", "deep"],
    bodyHints: ["balanced", "rectangle", "athletic", "hourglass"],
    palette: [0xfff7f7f7, 0xffb8bcc7, 0xff464c59, 0xff101214],
    paletteLabels: ["White", "Silver Grey", "Graphite", "Black"],
    hairstyle: "Sleek straight finish or sculpted low bun.",
    outfit:
      "Monochrome blazer set, silk inner layer, pointed pumps, and a compact structured bag.",
    explanation:
      "A monochrome formal outfit creates a long line and works well for ceremonies, presentations, and elevated evening plans.",
    imageUrl: "assets/images/ai_wedding_formal.jpg",
  },
  {
    title: "Casual Luxe Layers",
    occasion: "Casual",
    category: "Casual",
    moods: ["relaxed", "soft", "minimal", "clean"],
    styleTags: ["casual", "layered", "neutral", "comfort"],
    toneHints: ["warm", "neutral", "olive", "deep"],
    bodyHints: ["balanced", "rectangle", "pear", "petite"],
    palette: [0xffede4d6, 0xffc8a57e, 0xff4d5f50, 0xfffbfaf8],
    paletteLabels: ["Oat", "Camel", "Olive", "Off White"],
    hairstyle: "Soft ponytail or easy blowout.",
    outfit:
      "Relaxed cardigan, fitted tank, straight trousers, clean sneakers, and a soft crossbody bag.",
    explanation:
      "The look is easy to rewear, comfortable for long days, and still polished enough for cafés, errands, or casual meetings.",
    imageUrl: "assets/images/outfit.jpg",
  },
];

const trendLooks = [
  {
    id: "trend-1",
    title: "Soft Tailoring",
    category: "Trending",
    imageUrl: outfitCatalog[0].imageUrl,
    caption: "Fluid neutrals with a polished silhouette.",
    height: 252,
  },
  {
    id: "trend-2",
    title: "Modern Evening",
    category: "Celebrity",
    imageUrl: outfitCatalog[2].imageUrl,
    caption: "Minimal glamour with clean lines.",
    height: 228,
  },
  {
    id: "trend-3",
    title: "Traditional Layers",
    category: "Traditional",
    imageUrl: outfitCatalog[6].imageUrl,
    caption: "Rich textures and layered styling with a refined finish.",
    height: 212,
  },
  {
    id: "trend-4",
    title: "Night Street",
    category: "Trending",
    imageUrl: "assets/images/party.jpg",
    caption: "Dark layers and confident proportions.",
    height: 206,
  },
  {
    id: "trend-5",
    title: "Retro Knit",
    category: "Minimal",
    imageUrl: outfitCatalog[4].imageUrl,
    caption: "Warm tones with a throwback mood.",
    height: 236,
  },
  {
    id: "trend-6",
    title: "Color Story",
    category: "Color Guide",
    imageUrl: "assets/images/brunch.jpg",
    caption: "Editorial palettes that feel elevated and wearable.",
    height: 196,
  },
];

function buildDailyTrendLooks() {
  const daySeed = Math.floor(Date.now() / 86_400_000);
  const dailyCandidate = outfitCatalog[daySeed % outfitCatalog.length];
  return [
    {
      id: `daily-trend-${daySeed}`,
      title: dailyCandidate.title,
      category: "Trending",
      imageUrl: dailyCandidate.imageUrl,
      caption: dailyCandidate.explanation,
      height: 252,
    },
    ...trendLooks,
  ];
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
  const catalogOccasion = normalizeOccasion(occasionInput);
  const selected = [...outfitCatalog].sort(
    (a, b) =>
      scoreCandidate(b, profile, catalogOccasion, preferenceScores, source) -
      scoreCandidate(a, profile, catalogOccasion, preferenceScores, source)
  )[0];

  const mood = profile.styleMood || selected.moods[0] || "Polished";
  const referenceNote = imageReference
    ? " The outfit image was generated from your uploaded reference photo and used as the styling anchor for this direction."
    : "";

  const userGender = (profile.gender || "").toLowerCase();

  try {
    const genderQuery: any = { status: "active", stock: { $gt: 0 } };
    if (userGender === "female" || userGender === "male") {
      genderQuery.gender = { $in: [userGender, "unisex"] };
    }
    const shopItems = await ClothesModel.find(genderQuery).lean();
    const summarizeShopItems = (items: any[]) => {
      return items.map((item) => ({
        id: String(item._id),
        name: item.name,
        category: item.category,
        color: item.color,
        price: item.price,
        description: item.description,
      }));
    };

    const randomSubGenre = ["minimalist", "streetwear", "classic prep", "bohemian", "vintage-inspired", "athleisure chic", "grunge", "bold contemporary", "quiet luxury"][Math.floor(Math.random() * 9)];
    const seed = Math.random().toString(36).substring(7);

    const prompt = `Generate a unique, creative, and personalized fashion recommendation in JSON format for this user profile.
Focus on South Asian clothing styles of all types—including traditional (e.g., Kurta, Kurti, Saree, Anarkali, Sherwani), Indo-Western fusion (e.g., pairing kurtis/kurtas with jeans, wide-leg trousers, blazers, or Nehru jackets), modern Western, and casual/formal/seasonal wear (summer, winter, festive, etc.).
Adapt the style direction to the specified occasion (such as South Asian festivals like Diwali/Eid, wedding events like Sangeet/Mehendi/Haldi/Reception, casual get-togethers, office wear, or seasonal wear) and style preferences.

User Profile:
- Gender: ${profile.gender || "Not specified"}
- Height: ${profile.height || "Not specified"}
- Weight: ${profile.weight || "Not specified"}
- Skin Tone: ${profile.skinTone || "Not specified"}
- Skin Tone Hex: ${profile.skinToneHex || "Not specified"}
- Body Type: ${profile.bodyType || "Not specified"}
- Face Shape: ${profile.faceShape || "Not specified"}
- Style Mood: ${mood}
- Occasion: ${occasionInput}
- User Request Context: ${styleRequest || occasionInput}

Wardrobe Available (User's own clothes):
${JSON.stringify(summarizeWardrobeItems(wardrobeItems))}

Available Shop Catalog (Items you can recommend/select to build the outfit):
${JSON.stringify(summarizeShopItems(shopItems))}

Selection Seed: ${seed}

Your task is to generate a realistic outfit recommendation:
- You MUST select the most relevant matching items from the "Available Shop Catalog" list to build the outfit suggestion, and put their ids in the "matchedShopItemIds" array. Do not invent/hallucinate shop items; choose only from the list.
- Check "Wardrobe Available" and use any matching pieces the user already owns to build the outfit, and put their titles in the "wardrobeItemsUsed" array.

The response MUST be a JSON object matching this structure:
{
  "title": "A short elegant title for the look",
  "category": "Formal" | "Casual" | "Party" | "Activewear",
  "outfit": "Detailed description of the outfit using the chosen items from the shop catalog and/or user wardrobe",
  "hairstyle": "Recommended hairstyle details",
  "explanation": "Why this look suits their body type, face shape, and occasion",
  "paletteLabels": ["Color 1", "Color 2", "Color 3", "Color 4"],
  "matchedShopItemIds": ["shop_item_id_1", "shop_item_id_2"],
  "wardrobeItemsUsed": ["wardrobe_item_title_1", "wardrobe_item_title_2"]
}

Return ONLY the raw JSON. Do not include markdown code block syntax.`;

    const text = await callGeminiAPI(prompt, "You are an expert fashion stylist API that outputs JSON.", "application/json", 1.15);
    const aiResult = JSON.parse(text.trim());

    const paletteLabels = aiResult.paletteLabels || selected.paletteLabels;
    const palette = paletteLabels.map(() => 0xff000000 + Math.floor(Math.random() * 0xffffff));

    let generatedImageUrl = selected.imageUrl;
    if (imageReference) {
      generatedImageUrl = buildGeneratedOutfitImage(imageReference);
    } else if (aiResult.outfit) {
      generatedImageUrl = "https://image.pollinations.ai/prompt/" + 
        encodeURIComponent(`fashion look: ${aiResult.outfit}, aesthetic style, flat lay styling, professional fashion photography, editorial studio lighting, highly detailed`) + 
        `?width=500&height=500&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
    }

    const tempCandidate: OutfitCandidate & { matchedShopItemIds?: string[]; wardrobeItemsUsed?: string[] } = {
      title: aiResult.title || selected.title,
      occasion: occasionInput,
      category: aiResult.category || selected.category,
      moods: selected.moods,
      styleTags: selected.styleTags,
      toneHints: selected.toneHints,
      bodyHints: selected.bodyHints,
      palette: palette,
      paletteLabels: paletteLabels,
      hairstyle: aiResult.hairstyle || selected.hairstyle,
      outfit: aiResult.outfit || selected.outfit,
      explanation: aiResult.explanation || selected.explanation,
      imageUrl: generatedImageUrl,
      matchedShopItemIds: aiResult.matchedShopItemIds || [],
      wardrobeItemsUsed: aiResult.wardrobeItemsUsed || [],
    };

    let matchedProducts: MatchedShopItem[] = [];
    if (tempCandidate.matchedShopItemIds && tempCandidate.matchedShopItemIds.length > 0) {
      const validObjectIds = tempCandidate.matchedShopItemIds
        .map((id: string) => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      if (validObjectIds.length > 0) {
        const dbItems = await ClothesModel.find({
          _id: { $in: validObjectIds },
          status: "active",
        }).lean();

        matchedProducts = dbItems.map((item) => ({
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
          matchReason: `Selected specifically by your AI Stylist for this outfit`,
        }));
      }
    }

    // Fallback if no matching products were returned/found
    if (matchedProducts.length === 0) {
      matchedProducts = await findMatchedShopItems(tempCandidate, userGender);
    }

    let wardrobeCoverage = extractWardrobeCoverage(wardrobeItems, tempCandidate);
    if (tempCandidate.wardrobeItemsUsed && tempCandidate.wardrobeItemsUsed.length > 0) {
      wardrobeCoverage = {
        wardrobeItemsUsed: [...new Set(tempCandidate.wardrobeItemsUsed)].slice(0, 4),
        missingItemsToBuy: wardrobeCoverage.missingItemsToBuy,
      };
    }

    return {
      id: `api-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: tempCandidate.title,
      occasion: occasionInput,
      category: tempCandidate.category,
      mood,
      imageUrl: generatedImageUrl,
      outfit: tempCandidate.outfit,
      hairstyle: tempCandidate.hairstyle,
      explanation: `${tempCandidate.explanation}${referenceNote}`,
      palette: tempCandidate.palette,
      paletteLabels: tempCandidate.paletteLabels,
      wardrobeItemsUsed: wardrobeCoverage.wardrobeItemsUsed,
      missingItemsToBuy: wardrobeCoverage.missingItemsToBuy,
      matchedProducts,
    };
  } catch (error) {
    console.error("Gemini buildRecommendation failed, falling back to static matching:", error);
    const generatedImageUrl = imageReference
      ? buildGeneratedOutfitImage(imageReference)
      : selected.imageUrl;

    const matchedProducts = await findMatchedShopItems(selected, userGender);
    const wardrobeCoverage = extractWardrobeCoverage(wardrobeItems, selected);

    return {
      id: `api-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: selected.title,
      occasion: occasionInput,
      category: selected.category,
      mood,
      imageUrl: generatedImageUrl,
      outfit: selected.outfit,
      hairstyle: selected.hairstyle,
      explanation: `${selected.explanation} It is matched to ${buildProfileSummary(profile)}.${referenceNote}`,
      palette: selected.palette,
      paletteLabels: selected.paletteLabels,
      wardrobeItemsUsed: wardrobeCoverage.wardrobeItemsUsed,
      missingItemsToBuy: wardrobeCoverage.missingItemsToBuy,
      matchedProducts,
    };
  }
}

function buildGeneratedOutfitImage(imageReference: string): string {
  const referencePath = imageReference.startsWith("/uploads/")
    ? imageReference.replace("/uploads/", "")
    : imageReference;
  const safeName = path.basename(referencePath);
  const sourcePath = path.join(uploadsDir, safeName);

  if (!safeName || !fs.existsSync(sourcePath)) {
    return imageReference;
  }

  const extension = path.extname(safeName) || ".jpg";
  const generatedName = `ai-generated-${Date.now()}-${Math.floor(Math.random() * 1000)}${extension}`;
  const generatedPath = path.join(uploadsDir, generatedName);
  fs.copyFileSync(sourcePath, generatedPath);
  return `/uploads/${generatedName}`;
}

function fileSignalForImage(imageReference = "") {
  const referencePath = imageReference.startsWith("/uploads/")
    ? imageReference.replace("/uploads/", "")
    : imageReference;
  const safeName = path.basename(referencePath);
  const sourcePath = path.join(uploadsDir, safeName);

  if (!safeName || !fs.existsSync(sourcePath)) {
    return { exists: false, seed: Date.now(), sizeKb: 0, extension: "" };
  }

  const stat = fs.statSync(sourcePath);
  const seed = [...safeName].reduce((total, char) => total + char.charCodeAt(0), stat.size);
  return {
    exists: true,
    seed,
    sizeKb: Math.max(1, Math.round(stat.size / 1024)),
    extension: path.extname(safeName).replace(".", "").toLowerCase() || "jpg",
  };
}

function analyzeUploadedProfile(profile: StyleProfile, imageReference = "") {
  const signal = fileSignalForImage(imageReference);
  const tones = ["Warm", "Cool", "Neutral", "Olive", "Deep"];
  const bodies = ["Balanced", "Petite", "Rectangle", "Pear", "Athletic", "Hourglass"];
  const faces = ["Oval", "Round", "Heart", "Square", "Diamond"];
  const moods = [
    "Polished minimal",
    "Soft elegant",
    "Bold editorial",
    "Relaxed smart",
    "Modern romantic",
  ];
  const preferenceSets = [
    ["Minimal", "Neutral", "Tailored"],
    ["Elegant", "Soft", "Refined"],
    ["Bold", "Statement", "Party"],
    ["Casual", "Layered", "Practical"],
    ["Romantic", "Color", "Satin"],
  ];
  const index = Math.abs(signal.seed) % moods.length;

  return {
    ...profile,
    skinTone: profile.skinTone || tones[Math.abs(signal.seed) % tones.length],
    bodyType: profile.bodyType || bodies[Math.abs(signal.seed + 2) % bodies.length],
    faceShape: profile.faceShape || faces[Math.abs(signal.seed + 3) % faces.length],
    styleMood: moods[index],
    stylePreferences: preferenceSets[index],
    analysis: {
      imageReference,
      confidence: signal.exists ? 0.84 : 0.58,
      detectedFileType: signal.extension,
      sizeKb: signal.sizeKb,
      notes: signal.exists
        ? [
            "Uploaded image received by backend.",
            "Style profile hints generated from image metadata and current user profile.",
            "Recommendation image is derived from the uploaded reference.",
          ]
        : [
            "Image reference was not found in uploads.",
            "Generated recommendation from current profile fallback.",
          ],
    },
    generatedAt: new Date().toISOString(),
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
  const systemInstruction = `You are FashioMe Stylist, a professional, friendly, and expert AI fashion designer and personal stylist.
Your goal is to help the user with outfit styling tips, color recommendations, fit advice, hair recommendations, and wardrobe curation.

User Style Profile:
- Name/Display Name: ${profile.displayName || "User"}
- Skin Tone: ${profile.skinTone || "Not specified"}
- Body Type: ${profile.bodyType || "Not specified"}
- Face Shape: ${profile.faceShape || "Not specified"}
- Style Mood: ${profile.styleMood || "Not specified"}
- Style Preferences: ${profile.stylePreferences?.join(", ") || "Not specified"}

Respond naturally to any user message, including greetings, identity questions, follow-up questions, or open-ended style requests.
If the user is asking for an outfit or style direction, give a direct helpful recommendation.
If structured recommendation data is supplied in the prompt, weave it into the reply naturally instead of listing raw fields.
Keep the response concise, engaging, and professional (under 3-4 sentences).`;

  if (!normalizedMessage) {
    return {
      reply: "Tell me what you want styled, and I’ll help you put together a polished look."
    };
  }

  const intent = await inferAssistantIntent(normalizedMessage);
  let recommendation: Recommendation | undefined;

  if (intent.wantsRecommendation) {
    try {
      recommendation = await buildRecommendation(
        profile,
        intent.occasion || normalizedMessage,
        preferenceScores || {},
        source || "My Wardrobe",
        undefined,
        intent.styleRequest || normalizedMessage,
        wardrobeItems
      );
    } catch (error) {
      console.error("Failed to build structured recommendation for assistant chat:", error);
    }
  }

  const promptSections = [
    `User message: "${normalizedMessage}"`,
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
      ? `The user is asking for styling help. If the recommendation details are present, present them naturally and confidently like a real fashion website assistant.`
      : `The user is not asking for a structured outfit card. Answer naturally and helpfully.`,
  ].filter(Boolean);

  const reply = await callGeminiAPI(promptSections.join("\n\n"), systemInstruction);

  return {
    reply,
    recommendation
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

router.get("/trends", authorizedMiddleware, (_req, res) => {
  return ApiResponseHelper.success(
    res,
    buildDailyTrendLooks(),
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

  const discoverItems = trendLooks.filter((item) =>
    matches(item.title, item.category, item.caption)
  );
  const wardrobeItems = (wardrobe?.items ?? []).filter((item: any) =>
    matches(item.title, item.category, item.tag, item.outfit, item.explanation)
  );
  const matchedCandidate = outfitCatalog.find((item) =>
    matches(
      item.title,
      item.occasion,
      item.category,
      item.outfit,
      item.explanation,
      item.styleTags.join(" ")
    )
  );
  const recommendation = await buildRecommendation(
    profileData,
    matchedCandidate?.occasion || query || "Weekend",
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
      discoverItems: discoverItems.length > 0 ? discoverItems : trendLooks,
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

  wardrobe.items[itemIndex] = {
    ...wardrobe.items[itemIndex],
    ...updates,
    id: itemId,
  };
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
  const generatedProfile = analyzeUploadedProfile(profile, imageReference);
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
});

export default router;

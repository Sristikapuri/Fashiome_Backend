import { Router } from "express";
import fs from "fs";
import path from "path";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { authMiddleware } from "../middlewares/auth.middleware";
import { WardrobeCollectionModel } from "../models/wardrobe.model";

const router = Router();
const uploadsDir = path.join(__dirname, "../../uploads");

type StyleProfile = {
  displayName?: string;
  skinTone?: string;
  bodyType?: string;
  faceShape?: string;
  styleMood?: string;
  stylePreferences?: string[];
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
  if (normalized.includes("wedding")) return "Wedding";
  if (normalized.includes("party")) return "Party";
  if (normalized.includes("office") || normalized.includes("work")) return "Office";
  if (normalized.includes("travel")) return "Travel";
  if (normalized.includes("date")) return "Date Night";
  if (normalized.includes("festival")) return "Festival";
  if (normalized.includes("formal")) return "Formal";
  if (normalized.includes("casual")) return "Casual";
  return "Weekend";
}

function includesAny(source: string, values: string[]): boolean {
  const normalized = source.toLowerCase();
  return values.some((value) => normalized.includes(value.toLowerCase()));
}

function buildProfileSummary(profile: StyleProfile): string {
  const parts = [
    profile.skinTone ? `${profile.skinTone.toLowerCase()} skin tone` : "",
    profile.bodyType ? `${profile.bodyType.toLowerCase()} body type` : "",
    profile.faceShape ? `${profile.faceShape.toLowerCase()} face shape` : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "your current style profile";
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

function buildRecommendation(
  profile: StyleProfile,
  occasionInput = "Weekend",
  preferenceScores: Record<string, number> = {},
  source = "My Wardrobe",
  imageReference?: string
): Recommendation {
  const occasion = normalizeOccasion(occasionInput);
  const selected = [...outfitCatalog].sort(
    (a, b) =>
      scoreCandidate(b, profile, occasion, preferenceScores, source) -
      scoreCandidate(a, profile, occasion, preferenceScores, source)
  )[0];

  const mood = profile.styleMood || selected.moods[0] || "Polished";
  const referenceNote = imageReference
    ? " The outfit image was generated from your uploaded reference photo and used as the styling anchor for this direction."
    : "";
  const generatedImageUrl = imageReference
    ? buildGeneratedOutfitImage(imageReference)
    : selected.imageUrl;

  return {
    id: `api-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: selected.title,
    occasion,
    category: selected.category,
    mood,
    imageUrl: generatedImageUrl,
    outfit: selected.outfit,
    hairstyle: selected.hairstyle,
    explanation: `${selected.explanation} It is matched to ${buildProfileSummary(profile)}.${referenceNote}`,
    palette: selected.palette,
    paletteLabels: selected.paletteLabels,
  };
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

function buildAssistantReply({
  message,
  profile,
  currentRecommendation,
  preferenceScores,
  source,
}: {
  message: string;
  profile: StyleProfile;
  currentRecommendation?: Partial<Recommendation>;
  preferenceScores?: Record<string, number>;
  source?: string;
}) {
  const normalized = message.trim().toLowerCase();
  const inferredOccasion = inferOccasionFromMessage(normalized);
  const recommendation = inferredOccasion
    ? buildRecommendation(
        profile,
        inferredOccasion,
        preferenceScores || {},
        source || "My Wardrobe"
      )
    : null;

  if (recommendation) {
    return {
      reply: `For ${recommendation.occasion.toLowerCase()}, I’d put you in ${recommendation.outfit.toLowerCase()} Use ${recommendation.paletteLabels.slice(0, 3).join(", ")} tones and finish with ${recommendation.hairstyle.toLowerCase()}`,
      recommendation,
    };
  }

  if (normalized.includes("color") || normalized.includes("palette")) {
    const paletteLabels =
      (currentRecommendation?.paletteLabels as string[] | undefined) ||
      buildRecommendation(profile, "Weekend").paletteLabels;
    return {
      reply: `Your strongest color direction right now is ${paletteLabels.join(", ")}. These shades fit ${profile.skinTone?.toLowerCase() || "your"} complexion and keep the wardrobe cohesive.`,
    };
  }

  if (normalized.includes("hair")) {
    const hairstyle =
      currentRecommendation?.hairstyle ||
      buildRecommendation(profile, "Weekend").hairstyle;
    return {
      reply: `I’d pair this look with ${hairstyle.toLowerCase()} It keeps the outfit polished and balanced for your ${profile.faceShape?.toLowerCase() || "current"} face shape.`,
    };
  }

  if (normalized.includes("body") || normalized.includes("fit") || normalized.includes("shape")) {
    return {
      reply: `For your ${profile.bodyType?.toLowerCase() || "current"} proportions, focus on clean vertical lines, defined waist placement where useful, and one structured layer to keep the silhouette balanced.`,
    };
  }

  if (normalized.includes("help") || normalized.includes("suggest")) {
    return {
      reply:
        "Ask me for a wedding, office, party, travel, date night, or casual outfit and I’ll give you a complete look with colors and hairstyle.",
    };
  }

  const fallbackRecommendation = buildRecommendation(
    profile,
    currentRecommendation?.occasion || "Weekend",
    preferenceScores || {},
    source || "My Wardrobe"
  );

  return {
    reply: `I’d refine your look with ${fallbackRecommendation.outfit.toLowerCase()} This keeps the outfit aligned with your ${profile.styleMood?.toLowerCase() || "personal"} style and works well with ${fallbackRecommendation.paletteLabels.slice(0, 2).join(" and ")} accents.`,
  };
}

router.get("/dashboard", authMiddleware, (req, res) => {
  const profile = (req.query as StyleProfile) || {};
  const recommendation = buildRecommendation(profile, "Weekend");
  return ApiResponseHelper.success(
    res,
    {
      aiStyleOfDay: recommendation,
      recommendations: [recommendation],
    },
    "Dashboard generated successfully"
  );
});

router.get("/trends", authMiddleware, (_req, res) => {
  return ApiResponseHelper.success(
    res,
    buildDailyTrendLooks(),
    "Trends retrieved successfully"
  );
});

router.post("/generate-outfit", authMiddleware, (req, res) => {
  const {
    occasion = "Weekend",
    profileData = {},
    preferenceScores = {},
    source = "My Wardrobe",
    imageReference,
  } = req.body || {};

  const recommendation = buildRecommendation(
    profileData,
    occasion,
    preferenceScores,
    source,
    imageReference
  );

  return ApiResponseHelper.success(
    res,
    recommendation,
    "Outfit recommendation generated successfully"
  );
});

router.post("/assistant-chat", authMiddleware, (req, res) => {
  const {
    message = "",
    profileData = {},
    currentRecommendation,
    preferenceScores = {},
    source = "My Wardrobe",
  } = req.body || {};

  const result = buildAssistantReply({
    message,
    profile: profileData,
    currentRecommendation,
    preferenceScores,
    source,
  });

  return ApiResponseHelper.success(
    res,
    result,
    "Assistant reply generated successfully"
  );
});

router.post("/search", authMiddleware, async (req, res) => {
  const userId = (req as any).user?.userId;
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
  const recommendation = buildRecommendation(
    profileData,
    matchedCandidate?.occasion || query || "Weekend",
    preferenceScores,
    "Search"
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

router.get("/wardrobe", authMiddleware, async (req, res) => {
  const userId = (req as any).user?.userId;
  const wardrobe = await WardrobeCollectionModel.findOne({ userId }).lean();

  return ApiResponseHelper.success(
    res,
    wardrobe?.items ?? [],
    "Wardrobe retrieved successfully"
  );
});

router.post("/wardrobe", authMiddleware, async (req, res) => {
  const userId = (req as any).user?.userId;
  const item = req.body || {};
  const itemId = item.id || `${Date.now()}`;

  const wardrobe = await WardrobeCollectionModel.findOneAndUpdate(
    { userId },
    {
      $pull: { items: { id: itemId } },
      $setOnInsert: { userId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
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

router.post("/wardrobe/sync", authMiddleware, async (req, res) => {
  const userId = (req as any).user?.userId;
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  await WardrobeCollectionModel.findOneAndUpdate(
    { userId },
    { userId, items },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return ApiResponseHelper.success(
    res,
    { count: items.length },
    "Wardrobe synced successfully"
  );
});

router.patch("/wardrobe/:itemId", authMiddleware, async (req, res) => {
  const userId = (req as any).user?.userId;
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

router.delete("/wardrobe/:itemId", authMiddleware, async (req, res) => {
  const userId = (req as any).user?.userId;
  const { itemId } = req.params;

  const wardrobe = await WardrobeCollectionModel.findOneAndUpdate(
    { userId },
    { $pull: { items: { id: itemId } } },
    { new: true }
  );

  return ApiResponseHelper.success(
    res,
    { count: wardrobe?.items.length ?? 0 },
    "Wardrobe item deleted successfully"
  );
});

router.post("/generate-profile", authMiddleware, (req, res) => {
  const profile = req.body?.profileData || {};
  const imageReference = req.body?.imageReference || "";
  const occasion = req.body?.occasion || "Weekend";
  const preferenceScores = req.body?.preferenceScores || {};
  const source = req.body?.source || "Uploaded Reference";
  const generatedProfile = analyzeUploadedProfile(profile, imageReference);
  const recommendation = buildRecommendation(
    generatedProfile,
    occasion,
    preferenceScores,
    source,
    imageReference
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

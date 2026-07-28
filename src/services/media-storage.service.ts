import crypto from "crypto";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export const cloudStorageEnabled = Boolean(cloudName && apiKey && apiSecret);

function signature(parameters: Record<string, string | number>) {
  const payload = Object.keys(parameters).sort().map((key) => `${key}=${parameters[key]}`).join("&");
  return crypto.createHash("sha1").update(payload + apiSecret).digest("hex");
}

export async function uploadMedia(buffer: Buffer, originalName: string, folder = "fashiome") {
  if (!cloudStorageEnabled) throw new Error("Cloudinary storage is not configured");
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${folder}/${crypto.randomUUID()}-${originalName.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]));
  form.append("public_id", publicId);
  form.append("timestamp", String(timestamp));
  form.append("api_key", apiKey!);
  form.append("signature", signature({ public_id: publicId, timestamp }));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form });
  if (!response.ok) throw new Error(`Cloudinary upload failed (${response.status})`);
  const data = await response.json() as { secure_url: string; public_id: string };
  return { url: data.secure_url, publicId: data.public_id };
}

export async function uploadDataUrl(dataUrl: string, folder = "fashiome/ai") {
  const [, encoded] = dataUrl.split(",");
  return uploadMedia(Buffer.from(encoded, "base64"), `${Date.now()}.png`, folder);
}

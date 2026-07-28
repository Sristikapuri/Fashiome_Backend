import fs from "fs";
import path from "path";
import request from "supertest";
import app from "../src/app";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";
import { createRegularUserAndToken } from "./setup/helpers";

const uploadsDir = path.join(__dirname, "../uploads");

// A tiny valid 1x1 PNG so multer's mimetype-based fileFilter accepts it.
const PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

const uploadedFilePaths: string[] = [];

beforeAll(async () => {
  await connectTestDatabase();
}, 60_000);

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
  for (const filePath of uploadedFilePaths) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

describe("POST /api/v1/upload/upload-photo", () => {
  test("uploads a valid image and stores it on disk", async () => {
    const { token } = await createRegularUserAndToken();

    const response = await request(app)
      .post("/api/v1/upload/upload-photo")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", PNG_BUFFER, { filename: "photo.png", contentType: "image/png" });

    expect(response.status).toBe(200);
    expect(response.body.isSuccess).toBe(true);
    expect(response.body.responseData.filename).toBeTruthy();
    expect(response.body.responseData.fileUrl).toMatch(/^http/);

    const storedPath = path.join(uploadsDir, response.body.responseData.filename);
    uploadedFilePaths.push(storedPath);
    expect(fs.existsSync(storedPath)).toBe(true);
  });
});

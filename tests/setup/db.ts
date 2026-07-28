import fs from "node:fs";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | undefined;

/**
 * mongodb-memory-server normally downloads its own mongod binary on first
 * use, which needs network access and can be slow/unavailable in a sandboxed
 * CI runner. If a system mongod is already installed (common on dev
 * machines via Homebrew/apt), point at it directly instead.
 */
function findSystemMongodBinary(): string | undefined {
  const candidates = [
    process.env.MONGOD_SYSTEM_BINARY,
    "/opt/homebrew/bin/mongod",
    "/usr/local/bin/mongod",
    "/usr/bin/mongod",
  ];

  return candidates.find((candidate): candidate is string => !!candidate && fs.existsSync(candidate));
}

export async function connectTestDatabase(): Promise<void> {
  const systemBinary = findSystemMongodBinary();

  mongod = await MongoMemoryServer.create(
    systemBinary ? { binary: { systemBinary } } : undefined
  );

  await mongoose.connect(mongod.getUri());
}

export async function clearTestDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

export async function disconnectTestDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
    mongod = undefined;
  }
}

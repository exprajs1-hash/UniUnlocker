import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Stored on globalThis so hot reloads and serverless reuse share one pool.
const globalWithCache = globalThis as typeof globalThis & {
  __mongoose?: MongooseCache;
};
const cached: MongooseCache = (globalWithCache.__mongoose ??= {
  conn: null,
  promise: null,
});

const CONNECT_OPTIONS = {
  bufferCommands: false,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
};

/** SRV/TXT lookups that a mongodb+srv:// URI needs before it can connect. */
function isSrvLookupError(error: unknown): boolean {
  const syscall = (error as { syscall?: string })?.syscall;
  return syscall === "querySrv" || syscall === "queryTxt";
}

/**
 * Node reads the system DNS servers once at startup. If the network changed
 * since (Wi-Fi switch, VPN, router restart), SRV lookups can keep failing with
 * ECONNREFUSED, so on that error we retry once through public resolvers.
 */
async function connectWithDnsFallback(uri: string): Promise<typeof mongoose> {
  try {
    return await mongoose.connect(uri, CONNECT_OPTIONS);
  } catch (error) {
    if (!uri.startsWith("mongodb+srv://") || !isSrvLookupError(error)) throw error;
    const dns = await import("node:dns");
    console.warn("[mongodb] SRV lookup failed, retrying with public DNS:", (error as Error).message);
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
    return mongoose.connect(uri, CONNECT_OPTIONS);
  }
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  cached.promise ??= connectWithDnsFallback(uri);

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    // Clear the failed attempt so the next request can retry.
    cached.promise = null;
    throw error;
  }
}

import { MongoClient, ServerApiVersion } from "mongodb";
import { ApiError } from "@/src/server/api/errors";

declare global {
  var __remedygccMongoClientPromise__: Promise<MongoClient> | undefined;
}

function getMongoUri() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new ApiError(
      503,
      "MONGODB_NOT_CONFIGURED",
      "MONGODB_URI is not configured for the current environment.",
    );
  }

  return mongoUri;
}

function resolveDatabaseName(mongoUri: string) {
  try {
    const parsedUri = new URL(mongoUri);
    const pathname = parsedUri.pathname.replace(/^\/+/, "");
    return pathname || "remedygcc";
  } catch {
    return "remedygcc";
  }
}

export async function getMongoClient() {
  const mongoUri = getMongoUri();

  if (!global.__remedygccMongoClientPromise__) {
    const client = new MongoClient(mongoUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    global.__remedygccMongoClientPromise__ = client.connect();
  }

  return global.__remedygccMongoClientPromise__;
}

export async function getMongoDb() {
  const mongoUri = getMongoUri();
  const client = await getMongoClient();
  return client.db(resolveDatabaseName(mongoUri));
}

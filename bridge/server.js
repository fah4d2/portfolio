/**
 * Mongo data bridge for the Fahad Alazmi portfolio site.
 *
 * The website runs on a serverless edge runtime that cannot open a raw TCP
 * connection to MongoDB Atlas. This tiny service sits in between: the website
 * calls it over HTTPS with a shared secret, and it runs the real database
 * operations with the official MongoDB driver.
 *
 * Deploy it once (Render / Railway / Fly / any Node host) and set:
 *   MONGODB_URI   - your Atlas connection string
 *   BRIDGE_SECRET - a long random string, also saved in the website settings
 *   MONGODB_DB    - optional, database name (default: portfolio)
 */
import express from "express";
import { MongoClient } from "mongodb";

const PORT = process.env.PORT || 8787;
const MONGODB_URI = process.env.MONGODB_URI;
const BRIDGE_SECRET = process.env.BRIDGE_SECRET;
const DB_NAME = process.env.MONGODB_DB || "portfolio";

if (!MONGODB_URI) throw new Error("MONGODB_URI is required");
if (!BRIDGE_SECRET || BRIDGE_SECRET.length < 16) {
  throw new Error("BRIDGE_SECRET is required and must be at least 16 characters");
}

// Only these collections and operations are ever allowed through the bridge.
const ALLOWED_COLLECTIONS = new Set(["users", "bookings", "settings"]);
const ALLOWED_OPS = new Set([
  "find",
  "findOne",
  "insertOne",
  "updateOne",
  "deleteOne",
  "countDocuments",
  "createIndex",
]);

const client = new MongoClient(MONGODB_URI, { maxPoolSize: 5 });
const ready = client.connect();

const app = express();
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/query", async (req, res) => {
  const secret = req.get("x-bridge-secret");
  if (!secret || secret !== BRIDGE_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { collection, op, filter, document, update, options } = req.body || {};
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return res.status(400).json({ error: `collection not allowed: ${collection}` });
  }
  if (!ALLOWED_OPS.has(op)) {
    return res.status(400).json({ error: `operation not allowed: ${op}` });
  }

  try {
    await ready;
    const col = client.db(DB_NAME).collection(collection);
    let result;

    switch (op) {
      case "find":
        result = await col.find(filter || {}, options || {}).toArray();
        break;
      case "findOne":
        result = await col.findOne(filter || {}, options || {});
        break;
      case "insertOne": {
        const inserted = await col.insertOne(document);
        result = { insertedId: String(inserted.insertedId) };
        break;
      }
      case "updateOne": {
        const updated = await col.updateOne(filter || {}, update, options || {});
        result = {
          matchedCount: updated.matchedCount,
          modifiedCount: updated.modifiedCount,
          upsertedId: updated.upsertedId ? String(updated.upsertedId) : null,
        };
        break;
      }
      case "deleteOne": {
        const deleted = await col.deleteOne(filter || {});
        result = { deletedCount: deleted.deletedCount };
        break;
      }
      case "countDocuments":
        result = await col.countDocuments(filter || {});
        break;
      case "createIndex":
        result = await col.createIndex(document, options || {});
        break;
      default:
        return res.status(400).json({ error: "unsupported operation" });
    }

    return res.json({ result: JSON.parse(JSON.stringify(result ?? null)) });
  } catch (error) {
    console.error("bridge error", error);
    const duplicate = error && error.code === 11000;
    return res.status(duplicate ? 409 : 500).json({
      error: duplicate ? "duplicate" : "database error",
    });
  }
});

app.listen(PORT, () => console.log(`Mongo bridge listening on :${PORT}`));

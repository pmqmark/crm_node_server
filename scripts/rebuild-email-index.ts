import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.DATABASE_URL;

if (!uri) {
  throw new Error("DATABASE_URL is not defined.");
}

async function rebuildEmailIndex() {
  await mongoose.connect(uri as string, {
    dbName: process.env.DB_NAME,
    autoIndex: false,
  });

  const collection = mongoose.connection.collection("users");

  try {
    const indexes = await collection.indexes();
    const emailIndex = indexes.find((idx) => idx.name === "email_1");

    if (emailIndex) {
      console.log("Dropping existing email index:", emailIndex);
      await collection.dropIndex("email_1");
    } else {
      console.log("No existing email index found, creating new one.");
    }

    await collection.createIndex(
      { email: 1 },
      {
        unique: true,
        partialFilterExpression: { email: { $type: "string" } },
      },
    );

    console.log("Rebuilt email unique index successfully.");
  } finally {
    await mongoose.disconnect();
  }
}

rebuildEmailIndex().catch((err) => {
  console.error("Failed to rebuild email index:", err);
  process.exit(1);
});

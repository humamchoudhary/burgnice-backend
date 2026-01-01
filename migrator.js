// checkDatabase.js
const mongoose = require("mongoose");
require("dotenv").config();

const checkDatabase = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/your-database-name",
    );
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log("\nCollections in database:");
    collections.forEach((col) => {
      console.log(`- ${col.name}`);
    });

    // Check for any menu-related collections
    const menuCollections = collections.filter(
      (col) =>
        col.name.toLowerCase().includes("menu") ||
        col.name.toLowerCase().includes("item"),
    );

    console.log("\nMenu-related collections:");
    menuCollections.forEach((col) => {
      console.log(`- ${col.name}`);
    });

    // Check each collection for documents
    for (const col of menuCollections) {
      const collection = db.collection(col.name);
      const count = await collection.countDocuments();
      console.log(`\nCollection: ${col.name}`);
      console.log(`Document count: ${count}`);

      if (count > 0) {
        const sample = await collection.findOne();
        console.log("Sample document keys:", Object.keys(sample));
        console.log("Sample document:", JSON.stringify(sample, null, 2));
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
};

checkDatabase();

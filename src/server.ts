import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import createApp from "./app";
const app = createApp();

// console.log("My URL address:", process.env.MONGO_URL);

mongoose
  .connect(process.env.MONGO_URL as string, {})
  .then((data) => {
    console.log("MongoDB connection succeed");
    const PORT = process.env.PORT ?? 3002;
    app.listen(PORT, () => {
      console.info("The server is running on port:", PORT);
      console.info(`Admin project on http://localhost:${PORT}/admin \n`);
    });
  })
  .catch(() => { console.error("Database connection failed."); process.exitCode = 1; });
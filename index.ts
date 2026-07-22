import app from "./src/app";
import { connectToMongoDB } from "./src/database/mongodb";
import { PORT, validateProductionEnvironment } from "./src/configs/constant";

async function startServer() {
  validateProductionEnvironment();
  await connectToMongoDB();
  app.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Backend startup failed:", error);
  process.exitCode = 1;
});

import app from "./src/app";
import { connectToMongoDB } from "./src/database/mongodb";
import { PORT } from "./src/configs/constant";

connectToMongoDB();

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
import app from "./src/app";
import { connectToMongoDB } from "./src/database/mongodb";

connectToMongoDB();

const PORT = process.env.PORT || 8089;

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
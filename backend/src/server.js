import dotenv from "dotenv";
import { app } from "./app.js";

dotenv.config();

const port = Number(process.env.PORT || 4000);

const server = app.listen(port, () => {
  console.log(`Store Data Analysis backend running on http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(`Unable to start backend: port ${port} is already in use.`);
    console.error("Stop the existing process on this port or run with a different PORT value.");
    process.exit(1);
  }

  console.error("Backend startup failed:", error.message || error);
  process.exit(1);
});

import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/db.js";
import { initSocketIO } from "./utils/socketManager.js";

async function bootstrap() {
  try {
    await connectDatabase();

    const server = app.listen(env.port, () => {
      console.log(
        `SlotSync API running on http://localhost:${env.port}`
      );
    });

    initSocketIO(server);

    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down...`);

      server.close(async () => {
        try {
          const { disconnectDatabase } = await import("./config/db.js");

          await disconnectDatabase();

          process.exit(0);
        } catch (error) {
          console.error(
            "Shutdown failed:",
            error.message
          );

          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Application startup failed.");
    console.error(error.message);

    process.exit(1);
  }
}

bootstrap();
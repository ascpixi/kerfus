import { App, LogLevel } from "@slack/bolt";
import * as dotenv from "dotenv";

import { registerAllModules } from "./modules";
import { initializeDatabase } from "./db";

dotenv.config();

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    logLevel: LogLevel.DEBUG,
});

(async () => {
    try {
        await initializeDatabase();
        registerAllModules(app);

        await app.start(process.env.PORT || 3000);
        app.logger.info("[^owo^] Kerfuś is up and running!");
    } catch (error) {
        app.logger.error("Unable to start App", error);
    }
})();

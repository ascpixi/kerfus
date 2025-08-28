import type { App } from "@slack/bolt";
import sampleCommandCallback from "./sample-command";

function register(app: App) {
    app.command("/sample-command", sampleCommandCallback);
};

export default { register };

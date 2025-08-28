import type { App } from "@slack/bolt";
import sampleShortcutCallback from "./sample-shortcut";

function register(app: App) {
    app.shortcut("sample_shortcut_id", sampleShortcutCallback);
}

export default { register };

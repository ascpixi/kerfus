import type { App } from "@slack/bolt";
import sampleViewCallback from "./sample-view";

function register(app: App) {
    app.view("sample_view_id", sampleViewCallback);
}

export default { register };

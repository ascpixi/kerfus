import { App } from "@slack/bolt";

import * as bskyCrosspost from "./bsky-crosspost";
import * as appHome from "./app-home";
import { logInfo } from "../log";

export function registerAllModules(app: App) {
    bskyCrosspost.register(app);
    appHome.register(app);
    
    logInfo("All modules registered!");
}

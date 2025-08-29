import { Context } from "@slack/bolt";
import { logError } from "./log";

export async function downloadSlackFile(url: string, context: Context) {
    const resp = await fetch(url, {
        headers: {
            "Authorization": `Bearer ${context.botToken}`
        }
    });

    if (!resp.ok) {
        logError(`Download of ${url} failed!`, resp);
        return null;
    }

    return new Uint8Array(await resp.arrayBuffer());
}
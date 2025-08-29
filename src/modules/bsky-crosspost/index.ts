import { App } from "@slack/bolt";

import { msgbox } from "../../views";
import { connectionsForUser } from "../../external-connections";
import { logInfo } from "../../log";

export function register(app: App) {
    app.shortcut("crosspost_bsky", async ({ shortcut, ack, client }) => {
        const { trigger_id } = shortcut;
        await ack();

        if (shortcut.type != "message_action") {
            await msgbox(trigger_id, client, "Sorry, you can only use this shortcut on messages!");
            return;
        }
        
        const connections = await connectionsForUser(shortcut.user.id);
        if (connections.bsky.state != "CONNECTED") {
            await msgbox(
                trigger_id, client,
                "Oop... You haven't connected Bluesky with Kerfuś. In order to do that, open the App Home and click on Authenticate with Bluesky!"
            );

            return;
        }

        const msg = await app.client.conversations.history({
            channel: shortcut.channel.id,
            latest: shortcut.message_ts,
            inclusive: true,
            limit: 1
        });

        console.log(msg);

        // const bsky = connections.bsky.service!;
        // bsky.post({
        //     text: shortcut.message.text
        // })
    });

    logInfo("bsky-crosspost module registered");
}
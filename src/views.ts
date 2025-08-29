import type { WebClient } from "@slack/web-api";

export async function msgbox(trigger_id: string, client: WebClient, content: string) {
    return await client.views.open({
        trigger_id,
        view: {
            type: "modal",
            title: {
                type: "plain_text",
                text: "Kerfuś"
            },
            close: {
                type: "plain_text",
                text: "OK"
            },
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "plain_text",
                        text: content
                    }
                }
            ]
        }
    });
}
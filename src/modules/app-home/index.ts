import { App } from "@slack/bolt";
import type { WebClient } from "@slack/web-api";

import { msgbox } from "../../views";
import { bskyLogin, bskyLogout, connectionsForUser } from "../../external-connections";
import { logInfo } from "../../log";

async function updateHome(user: string, client: WebClient) {
    const connections = await connectionsForUser(user);

    await client.views.publish({
        user_id: user,
        view: {
            "type": "home",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "Hi! I'm Kerfus!",
                        "emoji": true
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "I'm @ascpixi's silly little robotic helper, hosted on Nest! I might suddenly break at any moment, though... please let my owner know if that happens. You can find my source code <https://github.com/ascpixi/kerfus|here>!"
                    },
                    "accessory": {
                        "type": "image",
                        "image_url": "https://raw.githubusercontent.com/ascpixi/kerfus/refs/heads/main/etc/niko-kerfus-sqr.png",
                        "alt_text": "Niko from OneShot riding a Kerfuś robot"
                    }
                },
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": ":link:  External connections",
                        "emoji": true
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "Data used to persist these connections will be stored in an encrypted local database."
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        (
                            (connections.bsky.state == "CONNECTED")
                            ? {
                                "type": "button",
                                "action_id": "disconnect_bsky",
                                "style": "danger",
                                "text": {
                                    "type": "plain_text",
                                    "text": ":bluesky:  Disconnect Bluesky",
                                    "emoji": true,
                                }
                            }
                            : {
                                "type": "button",
                                "action_id": "open_bsky_auth_modal",
                                "text": {
                                    "type": "plain_text",
                                    "text": ":bluesky:  Authenticate with Bluesky",
                                    "emoji": true,
                                },
                            }
                        ),
                    ]
                }
            ]
        }
    });
}

export function register(app: App) {
    app.event("app_home_opened", async ({ event, client }) => {
        logInfo(`Creating app home view for user ${event.user}`, event);
        if (event.tab !== "home")
            return;

        await updateHome(event.user, client);
    });

    app.action("open_bsky_auth_modal", async ({ ack, client, body }) => {
        await ack();
        if (body.type != "block_actions")
            return;

        await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                "callback_id": "submit_bsky_credentials",
                "title": {
                    "type": "plain_text",
                    "text": "Connect Bluesky",
                    "emoji": true
                },
                "submit": {
                    "type": "plain_text",
                    "text": "Submit",
                    "emoji": true
                },
                "type": "modal",
                "close": {
                    "type": "plain_text",
                    "text": "Cancel",
                    "emoji": true
                },
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "This will give Kerfuś full control over your account. You can get an app password <https://bsky.app/settings/app-passwords|here>."
                        }
                    },
                    {
                        "type": "input",
                        "block_id": "handle_block",
                        "element": {
                            "type": "plain_text_input",
                            "action_id": "handle"
                        },
                        "label": {
                            "type": "plain_text",
                            "text": "Identifier/handle",
                            "emoji": true
                        }
                    },
                    {
                        "type": "input",
                        "block_id": "password_block", 
                        "element": {
                            "type": "plain_text_input",
                            "action_id": "password"
                        },
                        "label": {
                            "type": "plain_text",
                            "text": "App Password",
                            "emoji": true
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "plain_text",
                            "text": ":warning:  Do note that these credentials will be stored in a database. You can revoke your app password at any time.",
                            "emoji": true
                        }
                    }
                ]
            }
        });
    });

    app.view("submit_bsky_credentials", async ({ ack, body, view, client }) => {
        await ack();
        if (body.type != "view_submission")
            return;

        const handle = view.state.values["handle_block"]["handle"].value;
        const password = view.state.values["password_block"]["password"].value;

        if (!handle || !password) {
            await msgbox(
                body.trigger_id, client,
                "Authentication with Bluesky failed; either the handle or the app password wasn't provided."
            );

            return;
        }

        if (!await bskyLogin(body.user.id, handle, password)) {
            await msgbox(
                body.trigger_id, client,
                "Woops... I couldn't connect your Bluesky account. Please verify that both the password and login are correct!"
            );
            
            return;
        }

        await updateHome(body.user.id, client);
    });

    app.action("disconnect_bsky", async ({ ack, body, client }) => {
        await ack();
        await bskyLogout(body.user.id);
        await updateHome(body.user.id, client);
    });

    logInfo("app-home module registered");
}
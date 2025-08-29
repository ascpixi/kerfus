import { App } from "@slack/bolt";
import { AppBskyEmbedImages, AppBskyEmbedVideo, AppBskyFeedPost } from "@atproto/api";
import ffprobe from "ffprobe";

import path from "path";
import fs from "fs/promises";

import { msgbox } from "../../views";
import { connectionsForUser } from "../../external-connections";
import { logError, logInfo } from "../../log";
import { downloadSlackFile } from "../../slack";
import tempWrite from "temp-write";

async function bskyAspectRatioFor(knownName: string, file: Uint8Array) {
    const tmp = await tempWrite(Buffer.from(file), knownName);
    const videoDetails = await ffprobe(tmp, { path: "ffprobe" });
    fs.rm(tmp);

    const stream = videoDetails.streams.filter(x => x.width && x.height)[0];

    return {
        $type: "app.bsky.embed.defs#aspectRatio" as const,
        width: stream.width!,
        height: stream.height!
    };
}

export function register(app: App) {
    app.shortcut("crosspost_bsky", async ({ shortcut, ack, client, context }) => {
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

        const res = await app.client.conversations.history({
            channel: shortcut.channel.id,
            latest: shortcut.message_ts,
            inclusive: true,
            limit: 1
        });

        const msg = res.messages![0];
        const bsky = connections.bsky.service!;

        let post: Partial<AppBskyFeedPost.Record> & Omit<AppBskyFeedPost.Record, "createdAt"> = {
            langs: ["en"], // kinda assuming here but whatever
            text: msg.text
        };

        if (msg.files && msg.files.length != 0) {
            const videos = msg.files.filter(x => x.mimetype?.startsWith("video/"));
            const images = msg.files.filter(x => x.mimetype?.startsWith("image/"));

            if (videos.length > 1) {
                await msgbox(trigger_id, client, "Sorry, that message has more than one video... Bluesky doesn't support that!");
                return;
            }

            if (videos.length != 0 && images.length != 0) {
                await msgbox(trigger_id, client, "Sorry, that message has both videos and images... we can't mix those on Bluesky!");
                return;
            }

            if (videos.length != 0) {
                // Video upload; https://docs.bsky.app/docs/tutorials/video
                const url = videos[0].mp4 ?? videos[0].url_private_download;
                if (!url) {
                    await msgbox(trigger_id, client, "Oops... that video doesn't seem downloadable.");
                    return;
                }

                const file = await downloadSlackFile(url, context);
                if (!file) {
                    await msgbox(trigger_id, client, "Oh noes! I couldn't download the video... ｡ﾟ･ (>﹏<) ･ﾟ｡ try again later...?");
                    return;
                }

                const { data } = await bsky.com.atproto.repo.uploadBlob(file);
                post.embed = {
                    $type: "app.bsky.embed.video",
                    video: data.blob,
                    aspectRatio: await bskyAspectRatioFor(path.basename(url), file)
                } satisfies AppBskyEmbedVideo.Main;
            }
            else {
                // Image upload
                const fetched = await Promise.all(
                    images.map(async x => ({
                        content: await downloadSlackFile(x.url_private_download!, context),
                        url: x.url_private_download!,
                        altText: x.alt_txt
                    }))
                );

                if (fetched.some(x => x.content == null)) {
                    await msgbox(trigger_id, client, "Oh noes! I couldn't download some of the images...  ｡ﾟ･ (>﹏<) ･ﾟ｡ try again later...?");
                    return;
                }

                const blobs = await Promise.all(
                    fetched.map(async x => ({
                        upload: await bsky.com.atproto.repo.uploadBlob(x.content!),
                        aspect: await bskyAspectRatioFor(path.basename(x.url), x.content!),
                        altText: x.altText
                    }))
                );

                post.embed = {
                    $type: "app.bsky.embed.images",
                    images: blobs.map(x => ({
                        $type: "app.bsky.embed.images#image",
                        image: x.upload.data.blob,
                        aspectRatio: x.aspect,
                        alt: x.altText ?? ""
                    }))
                } satisfies AppBskyEmbedImages.Main;
            }
        }

        let postUri: string;
        try {
            const result = await bsky.post(post);
            postUri = result.uri;
        }
        catch (ex) {
            logError("Failed to create a Bluesky post!", ex, msg);
            await msgbox(trigger_id, client, "Oh noes! I wasn't able to create a post...  ｡ﾟ･ (>﹏<) ･ﾟ｡");
            return;
        }

        const parts = postUri.match(/at:\/\/(did:.+)\/app\.bsky\.feed\.post\/(.+)/)!;
        const authorDid = parts[1];
        const postId = parts[2];

        await client.chat.postEphemeral({
            user: shortcut.user.id,
            channel: shortcut.channel.id,
            text: `all done, <@${shortcut.user.id}>! i've created the post for you! you can find it at https://bsky.app/profile/${authorDid}/post/${postId}!`
        });
    });

    logInfo("bsky-crosspost module registered");
}
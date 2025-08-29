import * as atp from "@atproto/api";
import { db, getUserData } from "./db";
import { logError } from "./log";

const connections = new Map<string, UserConnections>();

export interface ExternalConnection<T> {
    service: T | null;
    state: "CONNECTED" | "FAILED" | "DISCONNECTED";
}

/**
 * Represents the external app connections of a single user.
 */
export interface UserConnections {
    bsky: ExternalConnection<atp.Agent>;
}

export async function bskyLogout(slackId: string) {
    const connections = await connectionsForUser(slackId);
    
    connections.bsky = { service: null, state: "DISCONNECTED" };
    await db().update(db => {
        const user = db.knownUsers.find(x => x.id == slackId)!;
        user.bskyIdentifier = undefined;
        user.bskyAppPassword = undefined;
    });
}

export async function bskyLogin(slackId: string, handle: string, password: string, syncWithDb = true) {
    const connections = await connectionsForUser(slackId);

    try {
        const agent = new atp.AtpAgent({ service: "https://bsky.social" });
        const resp = await agent.login({ identifier: handle, password: password }); 

        if (!resp.success)
            throw new Error();

        if (syncWithDb) {
            await db().update(db => {
                const user = db.knownUsers.find(x => x.id == slackId)!;
                user.bskyIdentifier = handle;
                user.bskyAppPassword = password;
            });
        }

        connections.bsky = { state: "CONNECTED", service: agent };
        return true;
    }
    catch (ex) {
        logError("Bluesky connection failed!", ex);
        connections.bsky = { service: null, state: "FAILED" };
        return false;
    }
}

export async function connectionsForUser(slackId: string): Promise<UserConnections> {
    if (connections.has(slackId))
        return connections.get(slackId)!;
    
    // We start with all services being disconnected.
    connections.set(
        slackId,
        {
            bsky: { service: null, state: "DISCONNECTED" }
        }
    );

    const user = await getUserData(slackId);
    if (user) {
        // This user has data in the database - re-authenticate them
        if (user.bskyIdentifier && user.bskyAppPassword) {
            await bskyLogin(slackId, user.bskyIdentifier, user.bskyAppPassword, false);
        }
    }

    return connections.get(slackId)!;
}


import { Low, Adapter } from "lowdb";
import { PathLike } from "fs";
import { Writer } from "steno";
import * as crypto from "crypto";
import * as fs from "fs/promises";

export interface KnownUser {
    id: string;
    bskyIdentifier?: string;
    bskyAppPassword?: string;
}

export interface Database {
    knownUsers: KnownUser[];
}

class KerfusDatabaseFile<T> implements Adapter<T> {
    private key: Buffer;
    private writer: Writer;
    private filename: PathLike;

    constructor (secretKey: string, filename: PathLike) {
        this.key = Buffer.from(secretKey, "hex");
        this.writer = new Writer(filename);
        this.filename = filename;
    }

    async write(data: T) {
        const json = JSON.stringify(data);

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv("aes-256-gcm", this.key, iv);
        const encrypted = Buffer.concat([iv, cipher.update(json), cipher.final()]);

        this.writer.write(encrypted);
    }

    async read() {
        let data: Buffer;

        try {
            data = await fs.readFile(this.filename);
        }
        catch (e) {
            if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }

            throw e;
        }

        const iv = data.subarray(0, 16);
        const encrypted = data.subarray(16);
        const decipher = crypto.createDecipheriv("aes-256-gcm", this.key, iv);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
        return JSON.parse(decrypted);
    }
}

let database: Low<Database> | null = null;

export async function initializeDatabase() {
    if (database != null)
        throw new Error("Attempted to initialize the database more than once.");

    database = new Low<Database>(
        new KerfusDatabaseFile<Database>(process.env.DB_KEY!, "kerfus.db"),
        {
            knownUsers: []
        }
    );

    await database.read();
}

export function db() {
    if (database == null)
        throw new Error("Attempted to use the database before it has been initialized.");

    return database;
}

export async function getUserData(slackId: string) {
    await dbAcknowledgeUser(slackId);
    return db().data.knownUsers.find(x => x.id == slackId);
}

export async function dbAcknowledgeUser(slackId: string) {
    if (db().data.knownUsers.some(x => x.id == slackId))
        return;

    await db().update(db => {
        db.knownUsers.push({ id: slackId });
    });
}

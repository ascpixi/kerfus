// ATProto's npm packages are a bit of a mess, and as of the time of writing this, are
// using a version of the 'multiformats' package that fails to compile under TypeScript.
// This script fixes that until they actually fix this.

const fs = require("fs");

const target = "./node_modules/@atproto/lexicon/node_modules/multiformats/types/src/cid.d.ts";

let code = fs.readFileSync(target, "utf-8");
code = code
    .replaceAll(
        /*ts*/`export type MultibaseEncoder<Prefix> = import('./bases/interface').MultibaseEncoder<Prefix>;`,
        /*ts*/`export type MultibaseEncoder<Prefix extends string> = import('./bases/interface').MultibaseEncoder<Prefix>;`
    )
    .replaceAll(
        /*ts*/`export type MultibaseDecoder<Prefix> = import('./bases/interface').MultibaseDecoder<Prefix>;`,
        /*ts*/`export type MultibaseDecoder<Prefix extends string> = import('./bases/interface').MultibaseDecoder<Prefix>;`
    );

fs.writeFileSync(target, code, { encoding: "utf-8" });

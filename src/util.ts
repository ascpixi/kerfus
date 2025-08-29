import { AllMiddlewareArgs } from "@slack/bolt";

export function logErrors<TArgs extends AllMiddlewareArgs>(fn: (args: TArgs) => Promise<void>): (args: TArgs) => Promise<void> {
    return async function (args: TArgs) {
        try {
            await fn(args);
        }
        catch (e) {
            args.logger.error(e);
        }
    }
}

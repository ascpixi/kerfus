import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from "@slack/bolt";

async function sampleCommandCallback({ ack, respond, logger }: AllMiddlewareArgs & SlackCommandMiddlewareArgs) {
    try {
        await ack();
        await respond("Responding to the sample command!");
    }
    catch (error) {
        logger.error(error);
    }
}

export default sampleCommandCallback;

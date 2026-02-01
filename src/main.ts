import { Devvit } from "@devvit/public-api";
import { jsonEncode, ResolveSecondsAfter } from "anthelpers";
import { ConversationWrapperFromEvent } from "./ConversationWrapper.js";

Devvit.configure({
  redditAPI: true,
  redis: true
});

Devvit.addTrigger({
  event: "ModMail",
  onEvent: async (event, context) => {
    console.log('Hello', Date());

    const conversation = new ConversationWrapperFromEvent(event, context);
    await conversation.load(); console.log('Loaded', Date());

    console.log(jsonEncode({ conversation, message: conversation.latestMessage() }, true));
  },
});

export default Devvit;

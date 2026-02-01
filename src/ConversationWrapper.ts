import { type JobContext, type TriggerContext, type GetConversationResponse, type MessageData, type ConversationResponse } from "@devvit/public-api";
import { type ModMail } from "@devvit/protos";

/**
 * a wrapper for a Reddit Modmail Conversation
 */
export class ConversationWrapper {
  #conversationId: string; #context: TriggerContext | JobContext;
  #conversationData: GetConversationResponse | ConversationResponse | null = null;

  /**
   * creates a ConversationWrapper
   * @param conversationId the conversationId you got from reddit
   * @param context the devvit context you got from devvit
   */
  constructor(conversationId: string, context: TriggerContext | JobContext) {
    const conversationId_ = conversationId.split(/_/).at(-1);
    if (conversationId_ === undefined) throw TypeError('You need to pass a valid conversationId_ either in full form or split at the \'_\', but nothing was found');
    this.#conversationId = conversationId_; this.#context = context;
  }

  /**
   * loads the data into the class. constructors cant be async.
   * 
   * @returns {Promise<this>} returns this for method chaining.
   */
  async load(): Promise<this> {
    this.#conversationData = await this.#context.reddit.modMail.getConversation(
      { conversationId: this.#conversationId },
    );
    return this;
  }

  /**
   * returns the participant as user
   */
  participantUser() {
    const participant = this.#conversationData?.conversation?.participant;
    if (participant) {
      const name = participant.name;
      if (name === undefined) return undefined;
      return new ParticipantUser(
        name, Boolean(participant.isMod),
        Boolean(participant.isAdmin),
        Boolean(participant.isApproved),
        Boolean(participant.isDeleted),
      );
    }
    return undefined;
  }

  /**
   * the Modmail subject.
   * 
   * @returns null if its not loaded. a string if it is
   */
  get subject(): null | string {
    return this.#conversationData?.conversation?.subject ?? null;
  }

  messages() {
    const messages = this.#conversationData?.conversation?.messages;
    if (messages) {
      return Object.values(messages).map(redditMessage => new ModmailMessage(this, redditMessage));
    } else return undefined;
  }

  _messages() {
    return this.#conversationData?.conversation?.messages;
  }

  /**
   * archives the current conversation
   * 
   * @param _asUser reserved for future use. if true runs as the current user, this is not available in the devvit api
   */
  archiveConversation(_asUser: false = false): Promise<ConversationResponse> {
    return this.#context.reddit.modMail.archiveConversation(this.#conversationId);
  }

  /**
   * mutes the participant user of the current conversation
   * 
   * @param numHours For how many hours the conversation needs to be muted. Must be one of 72, 168, or 672 hours
   * @param _asUser  reserved for future use. if true runs as the current user, this is not available in the devvit api
   * @returns a reddit `ConversationResponse`
   */
  muteUser(numHours: 72 | 168 | 672, _asUser: false = false): Promise<ConversationResponse> {
    return this.#context.reddit.modMail.muteConversation({
      conversationId: this.#conversationId, numHours,
    });
  }
}

/**
 * @example
 * ```ts
 * Devvit.addTrigger({
 *   event: "ModMail",
 *   onEvent: async (event, context) => {
 *     const conversation = new ConversationWrapperFromEvent(event, context);
 *   },
 * });
 * ```
 */
export class ConversationWrapperFromEvent extends ConversationWrapper {
  #messageId: string;

  /**
   * `true` if the conversation is started by the bot. `false` if not. `null` if its not determined
   */
  public isSelf: boolean | null = null;
  constructor(event: { type: "ModMail" } & ModMail, context: TriggerContext) {
    if (event.messageAuthor?.name === undefined)
      throw TypeError('event.messageAuthor?.name is undefined');
    super(event.conversationId, context);
    this.#messageId = normalizeModmailId(event.messageId);
    Object.defineProperty(this, 'isSelf', {
      enumerable: true, configurable: false,
      writable: false, value: Boolean(
        context.appSlug === event.messageAuthor?.name,
      ),
    });
  }

  latestMessage() {
    const messages = super._messages();
    if (messages) {
      const messageById = messages[this.#messageId];
      return messageById ? new ModmailMessage(this, messageById) : undefined;
    } else return undefined;
  }
}

/**
 * A User. can be a mod or admin
 */
class ParticipantUser {
  /** The username of the user. */
  public name: string;

  /** Whether the user is a moderator marked by reddit. */
  public isMod: boolean;

  /** Whether the user is a Reddit Admin marked by reddit. */
  public isAdmin: boolean;

  /** Whether the user is Approved in the current subreddit */
  public isApproved: boolean = false;

  /** Whether the user isDeleted */
  public isDeleted: boolean = false;

  /**
   * Creates a new ParticipantUser.
   */
  constructor(name: string, isMod: boolean, isAdmin: boolean,
    isApproved: boolean, isDeleted: boolean) {
    this.name = name;
    this.isMod = isMod;
    this.isAdmin = isAdmin;
    Object.assign(this, { isApproved, isDeleted });
    Object.freeze(this);
  }
}

class ModmailMessage {
  /** the user who made the message */
  author: ParticipantUser;

  /**
   * HTML created by Reddit as a string
   */
  bodyHTML;

  /**
   * the markdown of the message
   */
  bodyMarkdown;

  /**
   * the conversationWrapper it belongs to
   */
  public conversationWrapper;

  constructor(conversation: ConversationWrapper, messageData: MessageData) {
    const participant = messageData.author;
    if (!participant || !participant.name) {
      throw new TypeError(`messageData [${messageData.id}]: has no participant`);
    } this.author = new ParticipantUser(
      participant.name,
      Boolean(participant?.isMod),
      Boolean(participant?.isAdmin),
      Boolean(participant?.isApproved),
      Boolean(participant?.isDeleted),
    ); this.conversationWrapper = conversation;
    this.bodyHTML = messageData.body!;
    this.bodyMarkdown = messageData.bodyMarkdown!;
    Object.defineProperty(this, 'conversationWrapper',
      { enumerable: false });
    Object.freeze(this);
  }
}

function normalizeModmailId(conversationId: string): string {
  return conversationId.split(/_/).at(-1)!;
}

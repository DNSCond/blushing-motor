import { Devvit, SetPostFlairOptions, type MenuItemOnPressEvent } from "@devvit/public-api";

Devvit.configure({
  redditAPI: true,
  redis: true,
});

Devvit.addSettings([
  {
    type: 'group',
    label: "set_flair",
    fields: [
      {
        type: 'boolean',
        name: 'setFlair',
        label: 'whether to set the flair at all',
        helpText: 'if disabled no falir is set',
      },
      {
        type: 'string',
        name: 'setFlairText',
        label: 'set_flair_text',
        defaultValue: '!Locked posts (for when op uses the command)',
        helpText: 'when locking by the bot, the fair_text will be set to this',
      },
      // {
      //   type: 'string',
      //   name: 'setFlair_css_class',
      //   label: 'set_flair_css_class',
      //   helpText: 'when locking by the bot, the fair_css_class will be set to this, if there is no value it is not altered',
      // },
      // {
      //   type: 'string',
      //   name: 'setFlair_template_id',
      //   label: 'set_flair_template_id',
      //   helpText: 'when locking by the bot, the flair_template_id will be set to this, if there is no value it is not altered',
      // },
    ]
  },
]);

Devvit.addMenuItem({
  label: "Lock or Unlock comments", location: "post", description: 'u/blushing-motor',
  onPress: async function (event: MenuItemOnPressEvent, context: Devvit.Context): Promise<void> {
    const username = context.username || (await context.reddit.getCurrentUsername()), postId = event.targetId,
      subredditName = context.subredditName || (await context.reddit.getCurrentSubredditName());
    if (username === undefined) { context.ui.showToast('You are not logged in'); return }

    await context.reddit.getPostById(event.targetId).then(async post => {
      if (post.authorName !== username) { context.ui.showToast('You dont own that post'); return }

      if (post.locked) {
        if (await context.redis.get(`unlockerId-${event.targetId}`)) {
          await post.unlock();
          context.ui.showToast({ text: 'Success, your post is now unLocked', appearance: 'success' });
          await context.redis.del(`unlockerId-${event.targetId}`, Date());
        } else {
          context.ui.showToast({ text: 'You didnt lock the post, therefore i cannot unlock it for you' });
        }
      } else {
        await post.lock();
        await context.redis.set(`unlockerId-${event.targetId}`, Date());
        context.ui.showToast({ text: 'Success, your post is now Locked', appearance: 'success' });
        const { setFlair_template_id, setFlair_css_class, setFlair, setFlairText } = await context.settings.getAll();
        const postFlair = new Object as SetPostFlairOptions;
        if (setFlair_template_id) postFlair.flairTemplateId = setFlair_template_id as string;
        if (setFlair_css_class) postFlair.cssClass = setFlair_css_class as string;
        if (setFlairText && setFlair) {
          postFlair.text = setFlairText as string;
          try {
            await context.reddit.setPostFlair(Object.assign(postFlair, {
              subredditName, postId,
            }));
          } catch (error) {
            context.ui.showToast('Error when setting flair');
            console.error(error);
          }
        }
      }
    });
  }
});

Devvit.addTrigger({
  event: 'PostDelete',
  async onEvent(event, context) {
    await context.redis.del(`unlockerId-${event.postId}`);
  },
})

export default Devvit;

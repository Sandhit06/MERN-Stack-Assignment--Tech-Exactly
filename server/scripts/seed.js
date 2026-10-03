const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connect } = require('../src/config/database');
const { User, Post, Comment } = require('../src/models');
const { slugify } = require('../src/services/content');
const stories = [
  [
    'The quiet art of paying attention',
    'Maya Chen',
    'maya@margin.local',
    'There is a small tree outside my kitchen window. For three years, I could have told you almost nothing about it. Then, one Tuesday, I noticed a bird building a nest in its branches. Suddenly, the tree became the most interesting thing on my street.\n\nAttention is a strange kind of currency. We spend it all day, often without deciding where it goes. A notification, a headline, a passing worry. By evening, we can feel exhausted without remembering what we actually saw.\n\nThat bird had a different approach. One twig. One journey. One small adjustment. It was not trying to finish everything at once. It was simply doing the next thing with its whole small body.\n\nI began leaving my phone in another room while I drank my morning coffee. Nothing dramatic happened. The world did not rearrange itself. But I started noticing the light on the counter, the sound of the kettle, the way the tree changed after rain.\n\nPerhaps paying attention is less about discovering something new and more about letting familiar things become visible again. We do not always need a different life. Sometimes we need a slower look at the one we have.\n\nTomorrow morning, find one ordinary thing and give it a minute. No photograph, no explanation, no particular outcome. Just a little room for the world to surprise you.',
  ],
  [
    'In praise of starting before you’re ready',
    'Arjun Mehta',
    'arjun@margin.local',
    'The first website I built was terrible. The colors argued with each other, the navigation was confusing, and the footer somehow floated halfway up the page. I was enormously proud of it.\n\nThat feeling is harder to find now. The more we learn, the easier it becomes to see every gap between what we imagine and what we can make. Knowledge is useful, but it can also become a very sophisticated reason to wait.\n\nI have been trying to separate practice from performance. A practice is allowed to be uneven. It does not need an audience. It only needs you to return to it, make a small attempt, and notice what happened.\n\nLast month I started drawing again. Ten minutes each evening, on the backs of envelopes. Some drawings look like the things they describe. Others look like maps of places that do not exist. Both kinds have taught me something.\n\nReadiness is not a doorway we pass through before beginning. Often, it is something that arrives during the work. You write the awkward paragraph, then the clearer one. You build the broken version, then understand how to fix it.\n\nIf there is something you have been waiting to start, consider making the smallest possible version today. Keep it private if that helps. Let it be a beginning rather than a verdict.',
  ],
  [
    'What a long walk can teach us',
    'Maya Chen',
    'maya@margin.local',
    'I used to measure a walk by its destination. The cafe, the park, the grocery store. Walking was the space between useful things. Then a friend invited me on a walk with no particular endpoint.\n\nAt first, this seemed inefficient. We took a street because it had good shade. We stopped to read a handwritten sign. We spent several minutes watching someone restore an old wooden door. Nothing needed to be accomplished.\n\nAfter half an hour, the conversation changed. We moved past the familiar updates and began talking about things neither of us had found a way to say while sitting across a table. There is something generous about looking in the same direction.\n\nA walk gives thoughts a different rhythm. They are allowed to appear, disappear, and return. The body keeps moving when the conversation pauses, so silence does not feel like a problem to solve.\n\nI still walk to get places. But once a week, I try to go out without a destination. Sometimes I return with an idea. Sometimes I return with nothing except cold hands and a better mood. Both seem like good reasons to go again.',
  ],
  [
    'Making room for the unfinished',
    'Arjun Mehta',
    'arjun@margin.local',
    'My notebook contains a list of things I have not finished. A short story, a small app, a recipe I keep meaning to try. For a while, I thought the list was evidence of a character flaw.\n\nBut not every unfinished thing is a failure. Some are experiments that answered their question. Some are interests that belonged to an earlier version of us. Others are waiting for a connection we have not made yet.\n\nThe difficult part is telling the difference between a project that needs patience and a project that needs permission to end. I have started asking a simple question: if nobody else ever saw this, would I still want to work on it?\n\nWhen the answer is yes, I make the next step smaller. Not finish the story, but write one scene. Not build the app, but sketch one screen. A small step is easier to take honestly.\n\nWhen the answer is no, I try to thank the project for what it taught me. This sounds sentimental, but it is more useful than carrying it around as an obligation.\n\nWe need room for work in progress. We also need room to change our minds. A notebook can hold both.',
  ],
  [
    'A good question is a kind of invitation',
    'Maya Chen',
    'maya@margin.local',
    'Someone once asked me what I had changed my mind about recently. It was a small question, asked over lunch, but I still remember how different it felt from being asked what I did for work.\n\nA good question gives someone permission to arrive as a whole person. It makes room for uncertainty, curiosity, and the parts of a life that do not fit neatly into an introduction.\n\nI have been collecting questions like these. What has surprised you lately? What are you learning slowly? What do you wish you had more time for? None of them demands an impressive answer.\n\nThe important part, of course, happens after the question. Listening is not simply waiting for a gap to insert our own story. It is allowing another person’s answer to take us somewhere we had not planned to go.\n\nConversations do not need to become profound to matter. Sometimes a thoughtful question and a few unhurried minutes are enough to make someone feel a little less alone.',
  ],
  [
    'The small rituals that hold a day together',
    'Arjun Mehta',
    'arjun@margin.local',
    'Every evening, I clear my desk before I stop working. It takes less than two minutes. A notebook closes, a cup goes to the kitchen, a pen returns to its place. The next morning, there is room to begin.\n\nI used to dismiss rituals as routines with better branding. But a ritual does something a schedule cannot: it gives a transition a shape. This part is finished. The next part can start.\n\nWe have fewer natural transitions than we once did. Work and home can happen in the same chair. Friends, news, and deadlines arrive through the same screen. It is easy for everything to feel like one long unfinished task.\n\nA small ritual can create a boundary without making a rule. Opening a window before breakfast. Walking around the block after work. Reading one page before reaching for a phone.\n\nThe best rituals are simple enough to survive an ordinary difficult day. They do not ask us to become different people. They simply help us notice the lives we are already living.',
  ],
];
async function seed() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Demo seeding is disabled in production.');
  if (
    !process.env.ADMIN_EMAIL ||
    !process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD.length < 10 ||
    !process.env.DEMO_PASSWORD ||
    process.env.DEMO_PASSWORD.length < 10
  )
    throw new Error(
      'Set ADMIN_EMAIL, ADMIN_PASSWORD and DEMO_PASSWORD in .env (passwords: 10+ characters).',
    );
  await connect();
  await Promise.all([User.init(), Post.init()]);
  const ensureUser = async (email, name, role, password) => {
    const existing = await User.findOne({ email });
    if (existing) return existing; // Never overwrite existing credentials or elevate an existing account.
    return User.create({ email, name, role, passwordHash: await bcrypt.hash(password, 12) });
  };
  await ensureUser(
    process.env.ADMIN_EMAIL.toLowerCase(),
    process.env.ADMIN_NAME || 'Margin Editor',
    'admin',
    process.env.ADMIN_PASSWORD,
  );
  for (let index = 0; index < stories.length; index++) {
    const [title, name, email, content] = stories[index];
    const author = await ensureUser(email, name, 'user', process.env.DEMO_PASSWORD);
    const post = await Post.findOneAndUpdate(
      { slug: slugify(title) },
      {
        $setOnInsert: {
          title,
          content,
          author: author._id,
          createdAt: new Date(Date.now() - index * 86400000),
          updatedAt: new Date(Date.now() - index * 86400000),
        },
      },
      { upsert: true, new: true, timestamps: false },
    );
    if (!post.updatedAt) {
      await Post.updateOne(
        { _id: post._id, updatedAt: { $exists: false } },
        { $set: { updatedAt: post.createdAt } },
        { timestamps: false },
      );
    }
    if (index === 0 && !(await Comment.exists({ post: post._id }))) {
      const reader = await ensureUser(
        'arjun@margin.local',
        'Arjun Mehta',
        'user',
        process.env.DEMO_PASSWORD,
      );
      await Comment.create({
        post: post._id,
        author: reader._id,
        content:
          '“Letting familiar things become visible again” — I’m taking that thought into tomorrow morning. Thank you for this.',
      });
    }
  }
  console.log(
    'Seed complete: six sample essays, two writers, and one admin. Existing records preserved. Credentials are in your private .env.',
  );
}
seed()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

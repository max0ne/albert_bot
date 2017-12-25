const Telegraf = require('telegraf');
require('dotenv').config();

import * as AlbertDB from './models/AlbertDB';
import * as sync from './controllers/sync';

type ReplyFunction = (msg: string) => void;
interface Context {
  reply: ReplyFunction;
}

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(async (ctx: any, next: (_: any) => Promise<any>) => {
  console.log(ctx);
  try {
    await next(ctx);
  }
  catch (error) {
    console.error(error);
  }
});

bot.command('all', async (ctx: Context) => {
  const classes = await AlbertDB.getClasses();
  if (classes.length === 0) {
    return ctx.reply('no classes synced');
  }
  ctx.reply(classes.map((cls) => `${cls.classTitle} - ${cls.classNumber} - ${cls.status}`).join('\n'));
  ctx.reply(`Last synced at ${await AlbertDB.lastSyncDate()}`);
});

bot.command('sync', async (ctx: Context) => {
  const date = new Date();
  ctx.reply('syncing');
  await sync.sync();
  ctx.reply(`synced in ${(new Date() as any - (date as any)) / 1000} seconds`);
});

bot.startPolling();

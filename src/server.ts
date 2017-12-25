require('dotenv').config();

import * as _ from 'lodash';
const Telegraf = require('telegraf');
const TelegrafLogger = require('telegraf-logger');

import * as sync from './controllers/sync';
import * as trigger from './controllers/trigger';

import * as AlbertDB from './models/AlbertDB';
import { ClassType } from './models/alberteer_types';

import { viewClass, viewClasses } from './view/view';
import * as view from './view/view';

type ReplyFunction = (msg: string) => void;
interface Context {
  reply: ReplyFunction;
  from: {
    id: string;
  };

  message: {
    text: string;
  };
}
type NextFunction = (ctx: Context) => void;

const bot = new Telegraf(process.env.BOT_TOKEN);

/**
 * catch exceptions middleware
 */
bot.use(async (ctx: any, next: (_: any) => Promise<any>) => {
  try {
    await next(ctx);
  }
  catch (error) {
    console.error(error);
  }
});

bot.use(new TelegrafLogger({
  // replace or remove placeholders as necessary
  format: '%updateType => @%username %firstName %lastName (%fromId): <%updateSubType> %content', // default
  contentLength: 100, // default
}).middleware());

/**
 * get all classes command
 */
bot.command('all', async (ctx: Context) => {
  const classes = await AlbertDB.getClasses();
  ctx.reply(viewClasses(classes) || 'no classes synced');
  ctx.reply(`Last synced ${view.sometimgAgo(await AlbertDB.lastSyncDate())}`);
});

/**
 * force sync classes
 */
bot.command('sync', async (ctx: Context) => {
  const date = new Date();
  ctx.reply('syncing');
  await sync.sync();
  ctx.reply(`synced in ${(new Date() as any - (date as any)) / 1000} seconds`);
});

/**
 * in memory storage of pending watching chat ids
 */
const waitingForWatchIds = [] as string[];
const waitingForUnwatchIds = [] as string[];

/**
 * watch commandd
 */
bot.command('watch', async (ctx: Context) => {
  const chatid = ctx.from.id;

  const watching = await AlbertDB.getWatches(chatid);
  const classes =
    (await AlbertDB.getClasses())
      .filter((cls) => !_.includes(watching, cls.section))
      .filter((cls) => cls.status === 'Closed');

  if (waitingForWatchIds.indexOf(chatid) === -1) {
    waitingForWatchIds.push(chatid);
  }

  bot.telegram.sendMessage(chatid, 'Select class to watch', {
    reply_markup: {
      one_time_keyboard: true,
      resize_keyboard: true,
      keyboard: classes.map((cls) => ([{
        text: viewClass(cls),
      }])),
    },
  });
});

/**
 * handle `/watch` or `/unwatch` command
 */
bot.on('message', async (ctx: Context, next: NextFunction) => {
  const chatid = ctx.from.id;
  const text = ctx.message.text;
  const section = (/^\[(.+)\]\s/.exec(text) || [])[1];
  if (!section) {
    return next(ctx);
  }

  if (_.includes(waitingForWatchIds, chatid)) {
    _.pull(waitingForWatchIds, chatid);
    return watchClass(chatid, text, section, ctx);
  }
  if (_.includes(waitingForUnwatchIds, chatid)) {
    _.pull(waitingForUnwatchIds, chatid);
    return unwatchClass(chatid, text, section, ctx);
  }
});

async function watchClass(chatid: string, text: string, section: string, ctx: Context) {
  const watchings = await AlbertDB.addWatch(chatid, section);
  ctx.reply(`Added ${viewClass((await AlbertDB.getClassesBySections([section]))[0])} to watching`);
  ctx.reply(`You are watching ${watchings.length} classes:\n${viewClasses(await AlbertDB.getClassesBySections(watchings))}`);
}

async function unwatchClass(chatid: string, text: string, section: string, ctx: Context) {
  const watchings = await AlbertDB.removeWatch(chatid, section);
  ctx.reply(`Removed ${viewClass((await AlbertDB.getClassesBySections([section]))[0])} from watching`);
  ctx.reply(`You are watching ${watchings.length} classes:\n${viewClasses(await AlbertDB.getClassesBySections(watchings))}`);
}

/**
 * get watching command
 */
bot.command('watching', async (ctx: Context) => {
  const chatid = ctx.from.id;
  const watchingClasses = await AlbertDB.getWatchedClasses(chatid);
  ctx.reply(`You are watching ${watchingClasses.length} classes:\n${viewClasses(watchingClasses)}`);
});

/**
 * unwatch command
 */
bot.command('unwatch', async (ctx: Context) => {
  const chatid = ctx.from.id;

  const classes = await AlbertDB.getWatchedClasses(chatid);
  if (classes.length === 0) {
    ctx.reply('You are not watching any classes');
    return;
  }

  if (waitingForUnwatchIds.indexOf(chatid) === -1) {
    waitingForUnwatchIds.push(chatid);
  }

  bot.telegram.sendMessage(chatid, 'Select class to unwatch', {
    reply_markup: {
      one_time_keyboard: true,
      resize_keyboard: true,
      keyboard: classes.map((cls) => ([{
        text: viewClass(cls),
      }])),
    },
  });
});

bot.command('run', async (ctx: Context) => {
  await trigger.__run(bot, true);
  ctx.reply('run');
});

/**
 * start bot
 */
bot.startPolling();

/**
 * kick off trigger
 */
trigger.start(bot);

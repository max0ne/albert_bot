import * as fs from 'fs';
fs.existsSync('.env') && require('dotenv').config();

import * as http from 'http';
import * as _ from 'lodash';
const Telegraf = require('telegraf');
const TelegrafLogger = require('telegraf-logger');

import * as common from './common/common';
import * as sync from './controllers/sync';
import * as trigger from './controllers/trigger';

import * as AlbertDB from './models/AlbertDB';
import * as WatchDB from './models/WatchDB';
import * as StatusDB from './models/StatusDB';
import { ClassType, SyncStatType } from './models/albert_types';
import { ReplyFunction, NextFunction, Context } from './types';

import { viewClass, viewClasses, viewStats } from './view/view';
// tslint:disable-next-line:no-duplicate-imports
import * as view from './view/view';

const BOT_TOKEN = common.envMust('BOT_TOKEN');
const bot = new Telegraf(BOT_TOKEN);

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

/**
 * avoid `MESSAGE_TOO_LONG` middleware
 */
bot.use((ctx: any, next: (_: any) => any) => {
  const oldReply = ctx.reply;
  ctx.reply = (msg: string) => {
    if (!_.isString(msg)) {
      return oldReply(msg);
    }

    const splittedMsgs = [] as string[];
    let current = '';
    msg.split('\n').forEach((line) => {
      if (current.length + line.length > 4000) {
        splittedMsgs.push(current);
        current = line;
      } else {
        current = [current, line].join('\n');
      }
    });
    splittedMsgs.push(current);
    return Promise.all(splittedMsgs.map(oldReply));
  };

  next(ctx);
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
  const param = (/\/sync\s+(.*)$/g.exec(ctx.message.text) || [])[1];
  const headless = param && param.indexOf('headless') !== -1;
  const date = new Date();
  ctx.reply('syncing');
  try {
    await sync.sync((...msg) => {
      msg.forEach(ctx.reply);
    }, headless);
    ctx.reply(`synced successed in ${(new Date() as any - (date as any)) / 1000} seconds`);
  } catch (error) {
    ctx.reply(`sync failed`);
    ctx.reply(error.toString());
  }
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
  const param = (/\/watch\s+(.*)$/g.exec(ctx.message.text) || [])[1];
  if (param) {
    const classes = await AlbertDB.searchClass(param);
    // if provided can find exactly 1 class to watch put that to watch
    if (classes.length === 1) {
      ctx.reply(`Putting ${viewClass(classes[0])} to watch`);
      return watchClass(chatid, classes[0].section, ctx);
    }
    // if found more classes match search ask which one to choose
    else if (classes.length > 1) {
      return chooseClassToWatch(classes);
    }
    // else fall through
  }

  /**
   * no param - give all `unwatched` classes as options
   */
  const watching = _.map(await WatchDB.getWatches(chatid), 'class_id');
  const classes =
    (await AlbertDB.getClasses())
      .filter((cls) => !_.includes(watching, cls.section))
      .filter((cls) => cls.status === 'Closed');
  chooseClassToWatch(classes);

  function chooseClassToWatch(classes: ClassType[]) {
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
  }
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
    return watchClass(chatid, section, ctx);
  }
  if (_.includes(waitingForUnwatchIds, chatid)) {
    _.pull(waitingForUnwatchIds, chatid);
    return unwatchClass(chatid, section, ctx);
  }
});

async function watchClass(chatid: string, section: string, ctx: Context) {
  await WatchDB.addWatch(chatid, section);
  ctx.reply(`Added ${viewClass((await WatchDB.getClassesBySections([section]))[0])} to watching`);
  // ctx.reply(`You are watching ${watchings.length} classes:\n${viewClasses(await AlbertDB.getClassesBySections(watchings))}`);
}

async function unwatchClass(chatid: string, section: string, ctx: Context) {
  await WatchDB.removeWatch(chatid, section);
  console.log('remove watch done');

  // ctx.reply(`Removed ${viewClass((await AlbertDB.getClassesBySections([section]))[0])} from watching`);
  // const watchings = await AlbertDB.getWatches(chatid);
  // ctx.reply(`You are watching ${watchings.length} classes`);
}

/**
 * get watching command
 */
bot.command('watching', async (ctx: Context) => {
  const chatid = ctx.from.id;
  const watchingClasses = await WatchDB.getWatchedClasses(chatid);
  ctx.reply(`You are watching ${watchingClasses.length} classes:\n${viewClasses(watchingClasses)}`);
});

/**
 * unwatch command
 */
bot.command('unwatch', async (ctx: Context) => {
  const chatid = ctx.from.id;

  const classes = await WatchDB.getWatchedClasses(chatid);
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
 * stats
 */
bot.command('stats', async (ctx: Context) => {
  const stats = await StatusDB.syncStats();
  ctx.reply(viewStats(stats));
});

/**
 * start bot
 */
bot.startPolling();

/**
 * kick off trigger
 */
trigger.start(bot);

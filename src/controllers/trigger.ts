import * as _ from 'lodash';
import * as dbg from 'debug';

import * as AlbertDB from '../models/AlbertDB';
import * as sync from './sync';
import { ClassType } from '../models/alberteer_types';
import { viewClass, viewClasses } from '../view/view';

const debug = dbg('alberteerbot');

async function notifyClassOpened(bot: any, chatid: string, openedWatchedClasses: ClassType[]) {
  bot.telegram.sendMessage(chatid, `🎉 Some classes you are watching are opened\n${viewClasses(openedWatchedClasses, true)}`, {
    parse_mode: 'Markdown',
  });
}

export async function __run(bot: any, nosync: boolean = false) {
  if (!nosync) {
    await sync.sync();
  }

  const classes = await AlbertDB.getClasses();
  const openClasses = classes.filter((cls) => cls.status === 'Open');
  const openClassesSections = _.map(openClasses, 'section');

  const  watchingChatids = await AlbertDB.getWatchedIds();
  for (const chatid of watchingChatids) {
    try {
      const watchedSections = await AlbertDB.getWatches(chatid);
      const openedWatchedClassSections = _.intersection(watchedSections, openClassesSections);
      if (openedWatchedClassSections.length > 0) {
        await notifyClassOpened(bot, chatid, await AlbertDB.getClassesBySections(openedWatchedClassSections));
      }
    } catch (error) {
      debug(`failed to send notification to ${chatid}`);
      debug(error);
    }
  }
}

async function run(bot: any) {
  try {
    debug('will run trigger');
    await __run(bot);
    debug('did run trigger');
  }
  catch (exception) {
    debug('failed run trigger');
    debug(exception);
  }
  finally {
    setTimeout(() => run(bot), Math.min(1, parseFloat(process.env.POLL_INTERVAL || 5)) * 60 * 1000);
  }
}

export function start(bot: any) {
  run(bot);
}

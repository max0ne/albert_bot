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
  // remember old
  const oldClasses = await AlbertDB.getClasses();

  // sync them
  if (!nosync) {
    await sync.sync();
  }

  // get newly synced
  const classes = await AlbertDB.getClasses();

  // get `used to be closed but now opened` classes
  const openClasses = classes.filter((cls) =>
    cls.status === 'Open' &&  // now open
    (oldClasses.find((old) => old.classNumber === cls.classNumber) || {} as ClassType).status !== 'Open'); // was NOT open
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
    setTimeout(() => run(bot), Math.max(1, parseFloat(process.env.POLL_INTERVAL || 5)) * 60 * 1000);
  }
}

export function start(bot: any) {
  run(bot);
}

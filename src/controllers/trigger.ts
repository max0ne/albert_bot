import * as _ from 'lodash';
import * as dbg from 'debug';

import * as common from '../common/common';
import * as AlbertDB from '../models/AlbertDB';
import * as WatchDB from '../models/WatchDB';
import * as sync from './sync';
import { ClassType, SyncStatType, WatchTableItemType } from '../models/albert_types';
import { viewClass, viewClasses } from '../view/view';

const debug = dbg('albert_bot');
const POLL_INTERVAL = common.envMust('POLL_INTERVAL');

async function notifyClassOpened(bot: any, chatid: string, openedWatchedClasses: ClassType[]) {
  bot.telegram.sendMessage(chatid, `🎉 Some classes you are watching are opened\n${viewClasses(openedWatchedClasses, true)}`, {
    parse_mode: 'Markdown',
  });
}

export async function __run(bot: any, nosync = false) {
  // remember old
  const oldClasses = await AlbertDB.getClasses();

  // sync them
  if (!nosync) {
    await sync.sync();
  }

  // send notifications
  notify(bot);
}

async function notifyOpenClass(bot: any, watch: WatchTableItemType) {
  // 0. get class detail
  const cls = (await WatchDB.getClassesBySections([watch.class_id]));

  // 1. send notification
  bot.telegram.sendMessage(watch.uid, `🎉 Some classes you are watching are opened\n${viewClasses(cls, true)}`, {
    parse_mode: 'Markdown',
  });

  // 2. mark as notified
  await WatchDB.putLastNotified(watch.uid, watch.class_id);
}

async function notify(bot: any) {
  const openSections = (await AlbertDB.getClasses()).filter((cls) => cls.status === 'Open');
  for (const section of openSections) {
    const watches = await WatchDB.getClassWatchers(section.section, Date.now() - 3600 * 1000);
    await Promise.all(watches.map(notifyOpenClass.bind(bot)));
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
    setTimeout(() => run(bot), Math.max(1, parseFloat(POLL_INTERVAL || 5)) * 60 * 1000);
  }
}
export function start(bot: any) {
  run(bot);
}

process.on('unhandledRejection', (reason: string, p: Promise<any>) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

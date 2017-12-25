import * as _ from 'lodash';

import * as db from './db';
import { ClassType } from './alberteer_types';

export async function getClasses() {
  // remove phd / ms thesis stuff / ms reading
  let classes = (await db.get('cls')) as ClassType[] || [];
  const blacklistKeywords = [
    'phd',
    'ADVANCED PROJECT IN COMPUTER SCIENCE',
    'Readings in Computer Science',
    'GUIDED STUDIES IN COMPUTER SCI',
    'MS THESIS IN COMPUTER SCIENCE',
    'SPECIAL TOPICS IN COMPUTER SCIENCE',
  ];
  classes = classes.filter((cls) => {
    return !blacklistKeywords.find((blk) => {
      return cls.classTitle.toLowerCase().indexOf(blk.toLowerCase()) !== -1;
    });
  });

  classes.forEach((cls) => {
    if (cls.classTitle === 'SELECTED TOPICS IN CS') {
      cls.classTitle = (cls as any).topic;
    }
  });

  return classes;
}

export async function searchClass(keyword: string, within?: ClassType[]) {
  keyword = keyword.toLowerCase();

  const classes = within || await getClasses();
  return classes.filter((cls) => (
    [
      'classNumber',
      'classTitle',
      'section',
    ].some((key) => (cls[key] || '').toLowerCase().includes(keyword))
  ));
}

export async function searchWatchedClasses(keyword: string, chatid: string) {
  return searchClass(keyword, await getWatchedClasses(chatid));
}

export async function putSynced(classes: ClassType[]) {
  await db.put('cls', classes);
  await db.put('last_sync', (new Date()).getTime());
}

export async function lastSyncDate() {
  return new Date(parseInt(await db.get('last_sync'), 10));
}

export async function addWatch(chatid: string, section: string) {
  const thisWatchings = await getWatches(chatid);
  if (thisWatchings.indexOf(section) === -1) {
    thisWatchings.push(section);
  }
  await putWatches(chatid, thisWatchings);
  return thisWatchings;
}

export async function getWatches(chatid: string) {
  return (await db.get(`watching_${chatid}`) || []) as string[];
}

export async function removeWatch(chatid: string, section: string) {
  const thisWatchings = await getWatches(chatid);
  _.pull(thisWatchings, section);
  await putWatches(chatid, thisWatchings);
  return thisWatchings;
}

/**
 * internal
 */
async function putWatches(chatid: string, watches: string[]) {
  return await Promise.all([
    db.put(`watching_${chatid}`, watches),
    watches.length > 0 ? rememberWatchedId(chatid) : forgetWatchedId(chatid),
  ]);
}

export async function getWatchedIds() {
  return (await db.get('watches') || []) as string[];
}

async function rememberWatchedId(chatid: string) {
  await db.put('watches', _.uniq([...await getWatchedIds(), chatid]));
}

async function forgetWatchedId(chatid: string) {
  await db.put('watches', _.pull(await getWatchedIds(), chatid));
}

export async function getClassesBySections(sections: string[]) {
  const classes = await getClasses();
  return sections.map((sec) => classes.find((cls) => cls.section === sec))
    .filter((cls) => !_.isNil(cls));
}

export async function getWatchedClasses(chatid: string) {
  return await getClassesBySections(await getWatches(chatid));
}

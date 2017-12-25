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

export async function allAvailableClasses() {
  const classes = await getClasses();
  return classes;
}

export async function putSynced(classes: ClassType[]) {
  await db.put('cls', classes);
  await db.put('last_sync', (new Date()).getTime());
}

export async function lastSyncDate() {
  return new Date(db.get('last_sync') as any as number);
}

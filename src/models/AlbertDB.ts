import * as _ from 'lodash';

import * as AWS from 'aws-sdk';
AWS.config.update({ region: 'us-east-1' });

import * as common from '../common/common';

import * as db from './db';
import { ClassType, SyncStatType, WatchTableItemType } from './albert_types';

let _cachedClasses: ClassType[];

export async function getClasses() {
  if (_.isNil(_cachedClasses)) {
    _cachedClasses = await __getClasses();
  }
  return _cachedClasses;
}

async function __getClasses() {
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

export async function putSynced(classes: ClassType[]) {
  _cachedClasses = undefined;
  await db.put('cls', classes);
  await db.put('last_sync', (new Date()).getTime());
}

export async function lastSyncDate() {
  return new Date(parseInt(await db.get('last_sync'), 10));
}

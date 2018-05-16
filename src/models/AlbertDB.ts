import * as _ from 'lodash';

import * as AWS from 'aws-sdk';
AWS.config.update({ region: 'us-east-1' });

import * as common from '../common/common';

const dynamoClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

const watch_table = 'albert_watch_table';
const watch_class_to_uid_index = 'class_id_uid_index';

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

export async function searchWatchedClasses(keyword: string, chatid: string) {
  return searchClass(keyword, await getWatchedClasses(chatid));
}

export async function putSynced(classes: ClassType[]) {
  _cachedClasses = undefined;
  await db.put('cls', classes);
  await db.put('last_sync', (new Date()).getTime());
}

export async function lastSyncDate() {
  return new Date(parseInt(await db.get('last_sync'), 10));
}

export async function addWatch(chatid: string, section: string) {
  const item: WatchTableItemType = {
    uid: chatid.toString(),
    class_id: section.toString(),
    created_at: Date.now(),
    last_notified: undefined,
  };
  return dynamoClient.put({
    TableName: watch_table,
    Item: item,
  }).promise();
}

export async function putLastNotified(chatid: string, section: string) {
  return dynamoClient.put({
    TableName: watch_table,
    Item: {
      uid: chatid,
      class_id: section,
      last_notified: Date.now(),
    },
  });
}

export async function getWatches(chatid: string): Promise<WatchTableItemType[]> {
  return (await dynamoClient.query({
    TableName: watch_table,
    KeyConditions: {
      uid: {
        AttributeValueList: [chatid.toString()],
        ComparisonOperator: 'EQ',
      },
    },
  }).promise()).Items as WatchTableItemType[];
}

/**
 * get watchers of a certain class
 *
 * @param section class id
 * @param notifiedBefore last_notified should be smaller than this
 */
export async function getClassWatchers(section: string, notifiedBefore: number) {
  const watches = (await dynamoClient.query({
    TableName: watch_table,
    IndexName: watch_class_to_uid_index,
    KeyConditions: {
      class_id: {
        AttributeValueList: [section.toString()],
        ComparisonOperator: 'EQ',
      },
    },
  }).promise()).Items as WatchTableItemType[];

  return watches.filter((watch) => _.isNil(watch.last_notified) || watch.last_notified < notifiedBefore);
}

export async function removeWatch(chatid: string, section: string) {
  return dynamoClient.delete({
    TableName: watch_table,
    Key: {
      uid: chatid.toString(),
      class_id: section,
    },
  }).promise();
}

export async function getClassesBySections(sections: string[]) {
  const classes = await getClasses();
  return sections.map((sec) => classes.find((cls) => cls.section === sec))
    .filter((cls) => !_.isNil(cls));
}

export async function getWatchedClasses(chatid: string) {
  const watches = await getWatches(chatid);
  return getClassesBySections(_.map(watches, 'class_id'));
}

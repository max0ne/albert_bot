import * as _ from 'lodash';
import * as common from '../common/common';
import * as AlbertDB from './AlbertDB';

import { ClassType, SyncStatType, WatchTableItemType } from './albert_types';

import { dynamoClient } from './db';
const watch_table = 'albert_watch_table';
const watch_class_to_uid_index = 'class_id_uid_index';

export async function searchWatchedClasses(keyword: string, chatid: string) {
  return AlbertDB.searchClass(keyword, await getWatchedClasses(chatid));
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
  const classes = await AlbertDB.getClasses();
  return sections.map((sec) => classes.find((cls) => cls.section === sec))
    .filter((cls) => !_.isNil(cls));
}

export async function getWatchedClasses(chatid: string) {
  const watches = await getWatches(chatid);
  return getClassesBySections(_.map(watches, 'class_id'));
}

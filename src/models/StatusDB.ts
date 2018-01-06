import * as _ from 'lodash';

import * as db from './db';
import { ClassType, SyncStatType } from './alberteer_types';

export async function justSyncSuccessed(classes: ClassType[]) {
  const opens = classes.filter((cls) => cls.status === 'Open');
  pushStat({
    syncedAt: new Date(),
    success: true,
    stats: {
      opens: opens.length,
      closes: classes.length - opens.length,
    },
  });
}

export async function justSyncFailed(error: any) {
  pushStat({
    syncedAt: (new Date().getTime() as any),
    success: false,
    error: error ? error.message || error.toString() : 'Empty Error Message',
  });
}

async function pushStat(stat: SyncStatType) {
  const stats = await syncStats();
  if (stats.length >= 10) {
    stats.shift();
  }
  stats.push(stat);
  db.put('sync_stats', stats);
}

export async function syncStats() {
  const stats = (await db.get('sync_stats') || []) as SyncStatType[];
  stats.forEach((stat) => {
    stat.syncedAt = new Date(stat.syncedAt);
  });
  return stats;
}

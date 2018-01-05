import { ClassType, SyncStatType } from '../models/alberteer_types';
import * as moment from 'moment';
import 'moment-timezone';

const ruokay = (bool: Boolean) => bool ? '✅' : '❌';

export function viewClasses(classes: ClassType[], clickable = false) {
  return classes.map((cls) => viewClass(cls, clickable)).join('\n');
}

export function viewClass(cls: ClassType, clickable = false) {
  if (clickable) {
    return `[${cls.section} - ${cls.classTitle.toLowerCase()} - ${cls.classNumber} - ${ruokay(cls.status === 'Open')}](${cls.href})`;
  } else {
    return `[${cls.section}] ${cls.classTitle.toLowerCase()} - ${cls.classNumber} - ${ruokay(cls.status === 'Open')}`;
  }
}

export function sometimgAgo(date: Date) {
  const diff = new Date() as any - (date as any);
  return `${diff / 1000} seconds ago`;
}

export function viewStats(stats: SyncStatType[]) {
  return stats.map((st) => {
    const time = moment(st.syncedAt).tz('America/New_York').format('LTS');
    const desc = st.success ? `${st.stats.opens} opens, ${st.stats.closes} closes` : st.error;
    return `${ruokay(st.success)} @${time} - ${desc}`;
  }).join('\n') || 'No available stats';
}

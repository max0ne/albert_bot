import { ClassType } from '../models/alberteer_types';

export function viewClasses(classes: ClassType[], clickable = false) {
  return classes.map((cls) => viewClass(cls, clickable)).join('\n');
}

export function viewClass(cls: ClassType, clickable = false) {
  if (clickable) {
    return `[${cls.section} - ${cls.classTitle} - ${cls.classNumber} - ${cls.status}](${cls.href})`;
  } else {
    return `[${cls.section}] ${cls.classTitle} - ${cls.classNumber} - ${cls.status}`;
  }
}

export function sometimgAgo(date: Date) {
  const diff = new Date() as any - (date as any);
  return `${diff / 1000} seconds ago`;
}

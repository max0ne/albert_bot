const albert_thing = require('albert_thing');
import * as AlbertDB from '../models/AlbertDB';
import * as StatusDB from '../models/StatusDB';

export async function sync(logger?: (...msg: string[]) => void, headful = false) {
  try {
    const classes = await albert_thing.search('Spring 2018', 'Tandon - Grad', 'Computer Science', logger, headful);
    await AlbertDB.putSynced(classes);
    StatusDB.justSyncSuccessed(classes);
  } catch (error) {
    StatusDB.justSyncFailed(error);
    throw error;
  }
}

const alberteer = require('../../alberteer/alberteer');
import * as AlbertDB from '../models/AlbertDB';
import * as StatusDB from '../models/StatusDB';

export async function sync(logger?: (...msg: string[]) => void, headless = true) {
  try {
    const classes = await alberteer.search('Spring 2018', 'Tandon - Grad', 'Computer Science', logger, headless);
    await AlbertDB.putSynced(classes);
    StatusDB.justSyncSuccessed(classes);
  } catch (error) {
    StatusDB.justSyncFailed(error);
    throw error;
  }
}

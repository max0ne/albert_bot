const alberteer = require('../../alberteer/alberteer');
import * as AlbertDB from '../models/AlbertDB';

export async function sync(logger?: (...msg: string[]) => void) {
  const classes = await alberteer.search('Spring 2018', 'Tandon - Grad', 'Computer Science', logger);
  await AlbertDB.putSynced(classes);
}

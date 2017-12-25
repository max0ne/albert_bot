const alberteer = require('albert');
import * as AlbertDB from '../models/AlbertDB';

export async function sync() {
  const classes = await alberteer.search('Spring 2018', 'Tandon - Grad', 'Computer Science');
  await AlbertDB.putSynced(classes);
}

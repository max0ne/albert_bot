import * as AWS from 'aws-sdk';
AWS.config.update({ region: 'us-east-1' });

import * as common from '../common/common';

const dynamoClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const dynamoDB = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const keykey = 'keykey';
const TableName = common.envMust('DYNAMO_TABLE_NAME');

/**
 * store something
 */
export async function put(key: string, val: any) {
  await dynamoDB.putItem({
    TableName,
    Item: {
      [keykey]: {
        S: key,
      },
      json: {
        S: JSON.stringify(val, undefined, 2),
      },
    },
  }).promise();
}

/**
 * get something
 */
export async function get(key: string) {
  const res = await dynamoDB.getItem({
    TableName,
    Key: {
      [keykey]: {
        S: key,
      },
    },
  }).promise();

  return res && res.Item && res.Item.json && JSON.parse(res.Item.json.S) as any;
}

a telegram bot to query classes from NYU Albert

---

### Deploy to AWS Beanstalk

1. setup DynamoDB table with env variable named `DYNAMO_TABLE_NAME`
1. setup env variables
1. get a telegram bot token from [Telegram Bot Father](https://core.telegram.org/bots#creating-a-new-bot)
1.
```bash
eb init
```

### Env variables

- POLL_INTERVAL

interval in minutes in which it refreshes data from albert

- BOT_TOKEN

telegram bot token

- DYNAMO_TABLE_NAME

table name in dynamo db

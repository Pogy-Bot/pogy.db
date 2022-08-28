<p align="center"><a href="https://nodei.co/npm/pogy.db"><img src="https://nodei.co/npm/pogy.db.png"></a></p>
<p align="center"><img src="https://img.shields.io/npm/v/pogy.db"> <img src="https://img.shields.io/npm/dm/pogy.db?label=downloads"> <img src="https://img.shields.io/npm/l/pogy.db"> <img src="https://img.shields.io/github/repo-size/pogy-bot/pogy.db">  <a href="https://pogy.xyz/support"><img src="https://discord.com/api/guilds/758566519440408597/widget.png" alt="Discord server"/></a></p>

# Pogy.db

Pogy.db is a mongoose **(v.6.5.2)** based database which is used in Pogy. Our database makes it easy for migrations, complicated queries, supports in map caching, logging to know what is happening within the database and more.

- Endured storage, your data doesn't disappear on restarts.
- Migrations, to backup your data every once in a while.
- Caching, to speed up your queries.
- Logging, get a log of when the database gets online, or offline.
- Ping, check the execution time of your queries.
- Fully customizable, you can customize your database options as you want.

## Download

```
npm i pogy.db
------ or ---------------------
yarn add pogy.db
```

## Example

```js
const database = require("pogy.db");
//or
import database from "pogy.db";

async function start() {
  //start the connection to the database
  await database.connect(
    "mongodb://localhost:27017/test",
    {
      cache: true,
      hidelogs: false,
      logFile: "./logs/database.log",
    },
    {
      keepAlive: true,
      minPoolSize: 3,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
    }
  );

  // Create a table or what you call as a collection, this will create a table called "users" if its not already created.
  const schema = await new database.table("users");

  // if the schema is available and the database is connected
  if (schema) {
    /* 
     Setting an object in the database:
     creates { id: "710465231779790849", username: "Peter_#4444" } in "discord"
     returns true if successful
   */
    await schema.set("discord", {
      id: "710465231779790849",
      username: "Peter_#4444",
    });

    /* 
     Pushing an element to an array in the database:
     returns true if successful
    */
    await schema.push("discord.badges", "verified");

    /* 
      Add a value (number) to a key in the database
      discord.message_count will be incremented by 1 which should now give 1
    */
    await schema.add("discord.message_count", 1);

    /* 
      Subtract a value (number) in the database
      discord.message_count will be decremented by 1 which should now give 0
    */
    await schema.subtract("discord.message_count", 1);

    /* 
      Get the value of a key in the database
      returns ["verified"]
    */
    await schema.get("discord.badges");

    /* 
      Get the value of a key in the database (boolean)
      returns true
    */
    await schema.has("discord.badges"); // -> true

    /* 
      Get the value of a key in the database (boolean)
      returns true
    */
    await schema.delete("discord.badges");

    /* 
      Returns all the schemas in the table
      { id: "710465231779790849", username: "Peter_#4444", message_count: 0 }
      options available: documentForm (boolean) -> returns the object as document arrays used for migrations
    */
    await schema.all();

    /* 
     Drop/delete the table from the database, boolean.
     returns true
    */
    await schema.drop();
  }
}

start();
```

## Test this Library

You can test all the functions at once by typing:

```bash
node test --url
```

but replace "url" with the url of your database.

- example: `npm test --mongodb://localhost:27017/test`

## Documentation

All functions in this package return a promise. So `await` is needed to get the result.

- database.connect() **(async Function)** - [Click here to go](#connect)
- database.table() **(async Function)** - [Click here to go](#table)
- database.migrate() **(async Function)** - [Click here to go](#migrate)
- database.ping() **(async Function)** - [Click here to go](#ping)
- database.isOnline() **(Function)** - [Click here to go](#isonline)
- database.DatabaseManager **(Class)** [Click here to go](#databasemanager)

## Connect

### connect(url, options, mongooseOptions)

```js
/*
  @param {string} url - The url to the database.
  @param {object} options - The options for the database.
  @param {object} mongooseOptions - The options for the mongoose connection.
*/

// available options
options = {
  cache: true, // Whether or not to cache the data.
  hidelogs: false, // Whether or not to hide the logs.
  logFile: "./logs/database.log", // The file to log to.
};

//if you don't want to log anything
options = {
  cache: true,
};

// default mongooseOptions
mongooseOptions = {
  keepAlive: true, // Whether or not to keep the connection alive.
  minPoolSize: 3, // The minimum pool size.
  maxPoolSize: 10, // The maximum pool size.
  serverSelectionTimeoutMS: 10000, // The server selection timeout.
  socketTimeoutMS: 60000, // The socket timeout.

  // all options are available on mongoose v6.5.2's documentation
  // https://mongoosejs.com/docs/connections.html#connection-string-options
};
```

So, connecting yo your database would be

```js
const database = require("pogy.db");
//or
import database from "pogy.db";
await database.connect(
  "mongodb://localhost:27017/test",
  {
    cache: true, // cache the data
    hidelogs: false, // don't hide the logs
    logFile: "./logs/database.log", // log to the database events in logs/database.log
  },
  {
    // mongoose options
    keepAlive: true,
    minPoolSize: 3,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 60000,
  }
);
```

## TABLE

### table(name)

This function is used to create a table in the database or fetch an existing table; its as if you are creating a schema in mongoose.

```js
/*
  table(name)
  @param {string} name - The name of the table
  @returns {object | boolean} - The table or false if the database is not connected.
*/
const users = await new database.table("users");

// if the schema is available and the database is connected
if (users) {
  /*
    set(key, value)
    @param {string} key - The key to set.
    @param {object | string | number} value - The value to set.
    @returns {boolean} - Whether or not the operation was successful.
  */
  await users.set(message.author.id, {
    username: message.author.username,
    discriminator: message.author.discriminator,
    id: message.author.id,
    avatar: message.author.avatarURL,
    badges: [],
    message_count: 0,
  });

  /*
    get(key)
    @param {string} key - The key to get.
    @returns {object | string | undefined} - The value of the key.
  */
  const username = await users.get(`${message.author.id}.username`);
  console.log(username); // -> "Peter_#4444"
}
```

### get(key)

This function is used to get the value of a key in the database.

```js
const user = await users.get(message.author.id);
console.log(user); // -> { username: "Peter_#4444", discriminator: "4444", id: "710465231779790849", avatar: "avatar", badges: [], message_count: 0 }

const username = await users.get(`${message.author.id}.username`);
console.log(username); // -> "Peter_#4444"
```

### set(key,value)

This function is used to set the value of a key in the database.

```js
/*
  set(key, value)
  @param {string} key - The key to set.
  @param {object | string | number} value - The value to set.
  @returns {boolean} - Whether or not the operation was successful.
*/
await users.set(`${message.author.id}.username`, "Peter_#4444"); // -> true
```

### add(key, number)

This function is used to add a number to a key in the database.

```js
/*
  add(key, number)
  @param {string} key - The key to add to.
  @param {number} number - The number to add | 0 if not specified.
  @returns {boolean} - Whether or not the operation was successful.
*/
await users.add(`${message.author.id}.message_count`, 1);

/*
  get(key)
  @param {string} key - The key to get.
  @returns {object | string | undefined} - The value of the key.
*/

const messageCount = await users.get(`${message.author.id}.message_count`);
console.log(messageCount); // -> 1
```

### subtract(key, number)

This function is used to subtract a number from a key in the database.

```js
/*
  subtract(key, number)
  @param {string} key - The key to subtract to.
  @param {number} number - The number to subtract | 0 if not specified.
  @returns {boolean} - Whether or not the operation was successful.
*/
await users.subtract(`${message.author.id}.message_count`, 1);

/*
  get(key)
  @param {string} key - The key to get.
  @returns {object | string | undefined} - The value of the key.
*/

const messageCount = await users.get(`${message.author.id}.message_count`);
console.log(messageCount); // -> 0
```

### has(key)

This function is used to check if a key exists in the database. (boolean)

```js
/*
  has(key)
  @param {string} key - The key to check.
  @returns {boolean} - Whether or not the key exists.
*/
await users.has(message.author.id); // -> true
await users.has(`${message.author.id}.invalid_property`); // -> false
```

### delete(key)

This function is used to delete a key in the database.

```js
/*
  delete(key)
  @param {string} key - The key to delete.
  @returns {true | null} - Whether or not the operation was successful.
*/
await users.delete(message.author.id); // -> true
```

### all()

This function is used to get all the schemas from the table in the database.

```js
/*
  all()
  @returns {object} - All the schemas in a table.
*/
const usersInDatabase = await users.all();
console.log(usersInDatabase); // -> [{ "710465231779790849": { username: "Peter_#4444", discriminator: "4444", id: "710465231779790849", avatar: "avatar", badges: [], message_count: 0 } }]
```

### push(key, element)

This function is used to push an element to an array in the database or create an array if it doesn't exist.

```js
/*
  push(key, element)
  @param {string} key - The key to push to.
  @param {object} element - The element to push.
  @returns {boolean} -  Whether or not the operation was successful.
*/
await users.push(`${message.author.id}.badges`, "bot_owner"); // -> true
// array becomes ['verified', 'bot_owner']
```

### drop()

This function is used to drop the entire table!

```js
/*
  drop()
  @returns {boolean} - Whether or not the operation was successful.
*/
await users.drop(); // -> true
```

### table (mongoose.Collection)

What if those functions are not enough and you want to use mongoose functions?
You can use `<your-table>.table.<function>` to call the function.

Examples:

- `users.table.find({})`
- `guilds.table.findOne({})`

or

```js
const users = await new database.table("users");

// if the database is online
if (users) {
  const customTable = await users.table.findOne({});
  console.log(customTable);
}
```

or

```js
// node js v14+
const customMongoDB = (await new database.table("users"))?.table;

const user = await users.findOne({
  id: "710465231779790849",
});

console.log(user);
```

## MIGRATE

### migrate(schema, newConnection)

This function is used to migrate the table to a new database connection.

```js
const users = await new database.table("users");

// if the database is online
if (users) {
  /*
    migrate(schema, newConnection)
    @param {string} schema - The schema name to migrate
    @param {object} newConnection - The new database connection.
    @param {object} options - The migration options. (hideLogs - Whether or not to hide the logs) (model - The model to use default [id: String, data: Object])
    @returns {object} - the migration status
  */
  await database.migrate("users", "mongodb://localhost:27017/test2", {
    hideLogs: false,
  });
}
```

## ping

Get the execution time of your queries.

```js
const database = require('pogy.db');

const ping = database db.ping({
      tableName: "users", // fetch one of the tables
      dataToGet: "710465231779790849" // fetch one existing data from the table
});

console.log(ping);
```

if the table or data is not found it will return "false" (boolean)

#### or

if the table is found it will return:

```json
{
  "cached": true, //if the data is cached
  "tableName": "users", // the table name provided
  "dataToGet": "710465231779790849", // the data requested
  "timeToGetTable": 0.03450000286102295, // the time taken to get the table in ms
  "timeToGetData": 0.011600017547607422, // the time taken to get the data in ms
  "totalPing": 0.04610002040863037 // the total ping (table and data) in ms
}
```

## isOnline

Check if the database is online.

```js
const database = require("pogy.db");

const isOnline = database.isOnline();

console.log(isOnline); //true or false
```

## DatabaseManager

The database manager that holds the mongoose client, cache, and tables.

```js
const database = require("pogy.db");
//or
import database from "pogy.db";
const DatabaseManager = database.DatabaseManager;

DatabaseManager.client; // the mongoose client, returns null if mongoose is not connected.
DatabaseManager.cache; // the cache, returns null if the cache is not enabled.
DatabaseManager.tables; // the tables, returns an empty array if no tables are created.
DatabaseManager.events; // the event emitter, databaseUp or databaseUp
```

#### How is this useful?

You can use this to check for instance if the database is connected.

```js
const DiscordClient = require("discord.js");
const client = new DiscordClient();
const database = require("pogy.db");
//or
import database from "pogy.db";

client.database = database.DatabaseManager.client;

console.log(client.database); // database connection or null


/* ----------------- or -------------- */

const pogyEvents = require("pogy.db").DatabaseManager.events;

pogyEvents.on("databaseUp", (data) => {
  console.log(data) // { reason: 'CONNECTED - The database connected.', date: 1661543764711 }
  console.log("database is up");
}

pogyEvents.on("databaseDown", (data) => {
  console.log(data) // { reason: 'DISCONNECTED - The database disconnected.', date: 1661543764711 }
  console.log("database is down :(");
}

/* ----------------- or -------------- */

const database = require("pogy.db");
console.log(database.isOnline()); // true or false

```

## Enabling Migrations

Do you want to create a routine to backup your database every once in a while?

```js
const cron = require("node-cron");
const database = require("pogy.db");
const mongoose = require("mongoose");
//or
import database from "pogy.db";

async function connect() {
  await database.connect(
    "mongodb://localhost:27017/test",
    {
      cache: true,
      hidelogs: false,
      logFile: "./logs/database.log",
    },
    {
      keepAlive: true,
      minPoolSize: 3,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
    }
  );

  client.database = database.DatabaseManager.client;

  // every 24 hours
  cron
    .schedule("0 0 * * *", async () => {
      // migrate a certain table
      const migration1 = await database.migrate(
        "users",
        "mongodb://localhost:27017/test2",
        {
          hideLogs: false, // add migration logs to your main logFile
          model: new mongoose.Schema({
            id: String,
            data: Object,
          }), // the model of the table, this is the default one but you can change it if you wanna customize your table.
        }
      );

      console.log(migration1);
      /*
       returns if there is no error:
       {
        error: false,
        date: date of migration in ms,
        timeTaken: time taken to migrate in ms,
        table: the table name,
        dataCreated: the data created length
       }

       returns if there is an error:
       {
        table: the table name,
        error: the error
       }
     */

      // or automatically migrate all tables
      database.DatabaseManager.tables.forEach(async (table) => {
        const migrationData = await database.migrate(
          table,
          "mongodb://localhost:27017/test2",
          {
            hideLogs: false, // add migration logs to your main logFile,
            model: new mongoose.Schema({
              id: String,
              data: Object,
            }), // the model of the table, this is the default one but you can change it if you wanna customize your table.
          }
        );

        console.log(migrationData);

        /*
          returns if there is no error:
          {
           error: false,
           date: date of migration in ms,
           timeTaken: time taken to migrate in ms,
           table: the table name,
           dataCreated: the data created length
          }

          returns if there is an error:
          {
           table: the table name,
           error: the error
          }
        */
       
      });
    })
    .start();
}

connect();
```

#### How can I use this?

You can for instance send discord webhooks using discord.js to send a webhook once a migration is completed with the information.

```js
const DiscordClient = require("discord.js");
const client = new DiscordClient();
const database = require("pogy.db");
//or
import database from "pogy.db";

async function connect() {
  await database.connect(
    "mongodb://localhost:27017/test",
    {
      cache: true,
      hidelogs: false,
      logFile: "./logs/database.log",
    },
    {
      keepAlive: true,
      minPoolSize: 3,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
    }
  );

  client.database = database.DatabaseManager.client;

  // create a migration on ready
  client.on("ready", async () => {
    client.database.tables
      .forEach(async (table) => {
        const migrationData = await database.migrate(
          table,
          "mongodb://localhost:27017/test2",
          {
            hideLogs: false, // add migration logs to your main logFile,
            model: {
              id: String,
              data: Object,
            }, // the model of the table, this is the default one but you can change it if you wanna customize your table.
          }
        );

        if (migrationData.error) {
          //send to migration error webhook
          const webhook = new DiscordClient.WebhookClient({
            url: "Webhook URL",
          });
          webhook.send(
            `Migration of ${migrationData.table} encountered an error!\nError: ${migrationData.error.message}`
          );
        } else {
          const webhook = new DiscordClient.WebhookClient({
            url: "Webhook URL",
          });
          webhook.send(
            `Migration of ${migrationData.table} completed!\nData Created: ${
              migrationData.dataCreated
            }\nDate: ${new Date(migrationData.date)}\nTime Taken: ${
              migrationData.timeTaken
            }ms`
          );
        }
      })
      .catch(console.error);
  });

  client.login("token");
}

connect();
```

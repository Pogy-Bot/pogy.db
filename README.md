<p align="center"><a href="https://nodei.co/npm/pogy.db"><img src="https://nodei.co/npm/pogy.db.png"></a></p>
<p align="center"><img src="https://img.shields.io/npm/v/pogy.db"> <img src="https://img.shields.io/npm/dm/pogy.db?label=downloads"> <img src="https://img.shields.io/npm/l/pogy.db"> <img src="https://img.shields.io/github/repo-size/pogy-bot/pogy.db">  <a href="https://pogy.xyz/support"><img src="https://discord.com/api/guilds/758566519440408597/widget.png" alt="Discord server"/></a></p>

# Pogy.db

Pogy.db is a mongoose **(v.6.5.2)** based database which is used in Pogy. Our database makes it easy for migrations, complicated queries, supports in map caching, logging to know what is happening within the database and more.

-   Endured storage, your data doesn't disappear on restarts.
-   Supports both mongoose and redis TTL.
-   Migrations, to backup your data every once in a while.
-   Caching using Maps or Redis, to speed up your queries.
-   Logging, get real-time updates on what is happening within the database and redis.
-   Ping, check the execution time of your queries.
-   Fully customizable, you can customize your database, tables and queries.
-   Built in support for Redis, that means you move from Maps to Redis as your application grows.
-   Beginner Friendly, Dot notation support, Asynchronous, and easy to use.

### Help

> [Click here](https://pogy.xyz/support) to join our support server.

## Download

```bash
npm install pogy.db --save
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
      cache: {
        toggle: true,
        cacheOnly: false
      },
      logs: {
        file: "database.log",
        hidden: false
      },
      redis: {
        url: "redis://localhost:6379",
      }
    },
    {
      keepAlive: true,
      minPoolSize: 3,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
    }
  );

  // Create a table or what you call as a collection
  // this will create a table called "users" if its not already created.
  // extended from Model<CollectionInterface<unknown>>
  const schema = await new database.table("users", {
    cacheLargeData: false,
    catchErrors: true
  });

  if (schema) {
    await schema.set(
      "discord",
      {
        id: "710465231779790849",
        username: "Peter_#4444",
      },
      {
        returnData: true,
        database: {
          ttl: 1
        },
        redis: {
          ttl: 1
        },
        cache: {
          toggle: true,
          cacheOnly: false,
        }
      }
    );


    await schema.push("discord.badges", "verified");

    await schema.pull("discord.badges", "verified");

    await schema.add("discord.message_count", 1);

    await schema.subtract("discord.message_count", 1);

    await schema.get("discord.badges");

    await schema.has("discord.badges"); // -> true

    await schema.delete("discord.badges");

    await schema.shift("discord.badges");

    await schema.unshift("discord.badges", "verified");

    await schema.stats();

    await schema.all({ documentForm: false,cache: {cacheOnly: false;},limit: 10,sort: "id",filter: (doc) => doc.id === "710465231779790849"});

    await schema.drop();
  }
}

start();
```

## Test this Library

You can test all the functions when downloading the repo at once by typing:

```bash
node test --mongoURL --redisURL
```

but replace "mongoURL" with the url of your database and "redisURL" (OPTIONAL) with the url of your redis server.

-   example: `node test --mongodb://localhost:27017/test --redis://localhost:6379`
-   -   No Redis: `node test --mongodb://localhost:27017/test`

## What you need to know

-   When using database ttl, the existing cache will automatically be detected and deleted once the main data has been deleted from the database.
-   If redis is somehow unavailable, the library will rely on raw mongoose.
-   All functions such as .delete() and .drop() are designed to delete existing cache related to the key when executed, so don't worry about useless cache taking up space.

## Documentation

All functions in this package return a promise. So `await` is needed to get the result.

-   database.connect() **(async Function)** - [Click here to go](#connect)
-   database.table() **(async Function)** - [Click here to go](#table)
-   database.migrate() **(async Function)** - [Click here to go](#migrate)
-   database.ping() **(async Function)** - [Click here to go](#ping)
-   database.isOnline() **(Function)** - [Click here to go](#isonline)
-   database.DatabaseManager **(Class)** [Click here to go](#databasemanager)

## Connect

### connect(url, options, mongooseOptions)

<table>
 <th>
  <td><b>url</b></td>
  <td><b>options</b></td>
  <td><b>mongooseOptions</b></td>
</th>
<tr>
  <td>Type</td>
  <td><b>string</b></td>
  <td><a href="#connect-options">Click Here</a></td>
  <td><a href="#connect-mongooseoptions">Click Here</a></td>
</tr>

</table>

#### connect-options

> defined in src\types\index.ts [5-17]

```ts
{
    cache?: {
        toggle?: boolean; // enable cache by default
        cacheOnly?: boolean; // only use cache by default
    };
    logs?: {
        hidden?: boolean; // hide logs
        file?: string; // log file path (ex: src/database.log)
    };
    redis?: {
        url: string; // redis connection url (ex: redis://localhost:6379)
    };
};
```

#### connect-mongooseOptions

> Mongoose options are defined in the [Mongoose Documentation](https://mongoosejs.com/docs/guide.html#options). They are the options mongoose uses to connect to the database.

**default:**

```js
{
   keepAlive: true,
   minPoolSize: 3,
   maxPoolSize: 10,
   serverSelectionTimeoutMS: 10000,
   socketTimeoutMS: 60000
}
```

## TABLE

### table(name, options)

This function is used to create a table in the database or fetch an existing table; its as if you are creating a model in mongoose.

> **returns:** `CustomizedTable` (src/types/index.ts [56-154])

**options:**

```ts
tableName: string, // table name
tableOptions?: {
      cacheLargeData?: boolean; // cache large data (first key) like table.set(key) instead of table.set(key.subKey)
      catchErrors?: boolean; // log the errors of the table if there are ever any
      watchDeletions?: boolean; // watch for deletions in the table (used to delete cache)
}
```

**watchDeletions**
This is used whenever you want to create a schema with cache on, and delete its cache automatically once the schema is deleted.

> IF CACHE IS DISABLED, THIS WON'T BE NEEDED!

> `.watch` in mongoose lowers the performance of the database, so it is recommended to only use this when you need it. Also keep in mind that when you restart your instance, you will have to re-initialize the watch and setting the data. Therefore, its recommended you only use this while deleting data in a short period of time. If you still want to use ttl, use ttl but with cache disabled. You can simply add { cache: {toggle: false} } to the options of the function and that is it.

1. Create the table and enable watchDeletions to delete the cache when a schema in the table is deleted.

```ts
const schema = await new database.table("users", {
    watchDeletions: true
});
```

2. Start by setting the data.

```ts
await schema.set(
    "discord",
    {
        id: "710465231779790849",
        username: "Peter_#4444"
    },
    {
        cache: {
            toggle: true,
            cacheOnly: false
        },
        database: {
            ttl: 1 //schema will be deleted after 1 second
        }
    }
);
```

Since cache is on and watchDeletions is enabled, the cache will be deleted once a schema with ttl is deleted in the table.

**example:**

```js
const users = await new database.table("users", {
    catchErrors: true
});

if (users) {
    await users.set(message.author.id, {
        username: message.author.username,
        discriminator: message.author.discriminator,
        id: message.author.id,
        avatar: message.author.avatarURL,
        badges: [],
        message_count: 0
    });

    const username = await users.get(`${message.author.id}.username`);
    console.log(username); // -> "Peter_#4444"
}
```

### get(key, options)

This function is used to get the value of a key in the database.

> **returns:** `Promise<null | string | number | unknown>`)

**params:**

```ts
key: string, // the key to get the value of
options?: {
 cache?: {
   toggle?: boolean; // if true, it will cache the data, if false it will only take the data from the database
   cacheOnly?: boolean; // if true, it will only take the data from the cache
 };
}

```

**example:**

```js
const user = await users.get(message.author.id, {
    cache: {
        toggle: true,
        cacheOnly: false
    }
});
console.log(user); // -> { username: "Peter_#4444", discriminator: "4444", id: "710465231779790849", avatar: "avatar", badges: [], message_count: 0 }

const username = await users.get(`${message.author.id}.username`);
console.log(username); // -> "Peter_#4444"
```

### set(key,value, options)

This function is used to set the value of a key in the database.

> **returns:** `Promise<null | boolean | unkown>`)

**params:**

```ts
 key: string, // the key to set the value of
 value: string | number | boolean | unknown, // the value to set the key to
 options?: {
    cache?: {
      toggle?: boolean; // if true, it will cache the data, if false it will only take the data from the database
      cacheOnly?: boolean; // if true, it will only take the data from the cache
    };
    returnData?: boolean; // if true, it will return the data instead of a boolean
    database?: {
      ttl?: number; // the time to expire the data in the database (in seconds)
    };
    redis?: {
      ttl?: number; // the time to expire the data in the redis cache (in seconds)
    };
  }
```

**example:**

```ts
await users.set(`${message.author.id}.username`, "Peter_#4444", {
    cache: {
        toggle: true,
        cacheOnly: false
    },
    returnData: true,
    database: {
        ttl: 60
    },
    redis: {
        ttl: 60
    }
}); // -> { username: "Peter_#4444", discriminator: "4444", id: "710465231779790849", avatar: "avatar", badges: [], message_count: 0 }
```

### add(key, number, options)

This function is used to add a number to a key in the database.

> **returns:** `Promise<null | boolean | unkown>`)

**params:**

```ts
 key: string, // the key to add the number to
 value: number | string, // the number to add to the key
 options?: {
   cache?: {
     toggle?: boolean; // if true, it use the cache
     cacheOnly?: boolean; // if true, it will only set the data in the cache
   };
   returnData?: boolean; // if true, it will return the data instead of a boolean
  }
```

**example**

```js
await users.add(`${message.author.id}.message_count`, 1);
```

### subtract(key, number,options)

This function is used to subtract a number from a key in the database.

> **returns:** `Promise<null | boolean | unkown>`)

**params:**

```ts
 key: string, // the key to subtract the number from
 value: number | string, // the number to subtract from the key
 options?: {
   cache?: {
     toggle?: boolean; // if true, it use the cache
     cacheOnly?: boolean; // if true, it will only set the data in the cache
   };
   returnData?: boolean;
  }
```

**example**

```js
await users.subtract(`${message.author.id}.message_count`, 1);
```

### has(key, options)

This function is used to check if a key exists in the database or cache. (boolean)

> **returns:** `Promise<null | boolean>`)

**params:**

```ts
 key: string, // the key to check if it exists
 options?: {
   cache?: {
     cacheOnly?: boolean; // if true, it will only check the cache
   };
 }
```

**example**

```js
await users.has(message.author.id, {
    cache: {
        cacheOnly: true
    }
}); // -> true
await users.has(`${message.author.id}.invalid_property`); // -> false
```

### delete(key, options)

This function is used to delete a key in the database.

> **returns:** `Promise<null | boolean>`)

**params:**

```ts
 key: string, // the key to check if it exists
 options?: {
   cache?: {
     cacheOnly?: boolean; // if true, it will only delete the cache
   };
 }
```

**example**

```js
await users.delete(message.author.id); // -> true
```

### all(options)

This function is used to get all the collections from the table in the database.

> **returns:** `Promise<unknown>`)

**params:**

```ts
  documentForm?: boolean; // if true, it will return the data in a document form
  cache?: {
      cacheOnly?: boolean; // if true, it will only get the data from the cache
  };
  limit?: number; // the limit of the data to get
  sort?: string; // the key to sort the data by
  filter?: (data) => boolean; // a filter function to filter the data
```

**example**

```js
const usersInDatabase = await users.all({
    documentForm: true,
    cache: {
        cacheOnly: false
    },
    limit: 10,
    sort: "message_count",
    filter: (data) => data.message_count > 100
});
```

### push(key, element, options)

This function is used to push an element to an array in the database or create an array if it doesn't exist.

> **returns:** `Promise<null | boolean | unknown>`)

**params:**

```ts
    key: string, // the key to push the element to
    value: string | number | boolean | unknown, // the element to push to the array
      options?: {
        cache?: {
             toggle?: boolean; // if true, it will use the cache
         };
      returnData?: boolean; // if true, it will return the data instead of a boolean
    }
```

**example**

```js
await users.push(`${message.author.id}.badges`, "bot_owner", {
    returnData: false,
    cache: {
        toggle: false
    }
}); // -> true
```

### pull(key, element, options)

This function is used to pull an element from an array in the database.

> **returns:** `Promise<null | boolean | unknown>`)

**params:**

```ts
    key: string, // the key to push the element to
    value: string | number | boolean | unknown, // the element to push to the array
      options?: {
        cache?: {
             toggle?: boolean; // if true, it will use the cache
         };
      returnData?: boolean; // if true, it will return the data instead of a boolean
    }
```

**example**

```js
await users.pull(`${message.author.id}.badges`, "bot_owner", {
    returnData: false,
    cache: {
        toggle: false
    }
}); // -> true
```

### shift(key, element, options)

This function is used to shift an element from an array in the database.

> **returns:** `Promise<null | boolean | unknown>`)

**params:**

```ts
    key: string, // the key to push the element to
    value: string | number | boolean | unknown, // the element to push to the array
      options?: {
        cache?: {
             toggle?: boolean; // if true, it will use the cache
         };
      returnData?: boolean; // if true, it will return the data instead of a boolean
    }
```

**example**

```js
await users.shift(`${message.author.id}.badges`, "bot_owner", {
    returnData: false,
    cache: {
        toggle: false
    }
}); // -> true
```

### unshift(key, element, options)

This function is used to unshift an element to an array in the database.

> **returns:** `Promise<null | boolean | unknown>`)

**params:**

```ts
    key: string, // the key to push the element to
    value: string | number | boolean | unknown, // the element to push to the array
      options?: {
        cache?: {
             toggle?: boolean; // if true, it will use the cache
         };
      returnData?: boolean; // if true, it will return the data instead of a boolean
    }
```

**example**

```js
await users.unshift(`${message.author.id}.badges`, "bot_owner", {
    returnData: false,
    cache: {
        toggle: false
    }
}); // -> true
```

### drop()

This function is used to drop the entire table!

> **returns:** `Promise<null | boolean>`)

**example**

```js
await users.drop(); // -> true
```

### stats()

This function is used to get the stats of the table.

> **returns:** `Promise<unknown>`

**example**

```js
const stats = await users.stats();
console.log(stats);
```

### table

> extended from `Model<CollectionInterface<unknown>>` _(refer to src\types\index.ts)_

What if those functions are not enough and you want to use mongoose functions?
You can use `<your-table>.table.<function>` to call the function.

Examples:

-   `users.table.find({})`
-   `guilds.table.findOne({})`

or

```js
const users = await new database.table("users", {
    catchErrors: true // logs errors if there's an error in the function
});

// if the database is online
if (users) {
    const customTable = await users.table.findOne({});
    console.log(customTable);
}
```

or

```js
// node js v14+
const customMongoDB = (
    await new database.table("users", [
        (catchErrors: true) // logs errors if there's an error in the function
    ])
)?.table;

const user = await users.findOne({
    id: "710465231779790849"
});

console.log(user);
```

## MIGRATE

### migrate(schema, newConnection, options)

This function is used to migrate the table to a new database connection.

**params:**

```ts
schema: string, // the schema to migrate to
newConnection: string, // the new connection URL to migrate to
options: {
  logs?: {
        hidden?: boolean; // log realtime migration debug information
  };
}
```

**example**

```js
const users = await new database.table("users", {
    catchErrors: true
});

// if the database is online
if (users) {
    await database.migrate("users", "mongodb://localhost:27017/test2", {
        logs: {
            hideLogs: false
        }
    });
}
```

## ping

Get the execution time of your queries.

**results:**

```ts
cached: boolean; // if the cache is enabled
tableName: string; // the table name
dataToGet: string; // the data to get
timeToGetTable: number; // the time to get the table
timeToGetData: number; // the time to get the data
totalPing: number; // the total ping
redisPing: number | "Redis not enabled."; // the redis ping
```

> If the table or data is not found it will return false data.

**example:**

```js
const database = require('pogy.db');

const ping = database db.ping({
      tableName: "users",
      dataToGet: "710465231779790849"
});

console.log(ping);
```

```json
{
    "cached": true, //if the data is cached
    "tableName": "users", // the table name provided
    "dataToGet": "710465231779790849", // the data requested
    "timeToGetTable": 0.03450000286102295, // the time taken to get the table in ms
    "timeToGetData": 0.011600017547607422, // the time taken to get the data in ms
    "redisPing": 1.380900003015995, // the time taken to ping redis, if redis is enabled
    "totalPing": 0.04610002040863037, // the total ping (table and data) in ms
}
```

## isOnline

Check if the database is online.

```js
const database = require("pogy.db");

const isOnline = database.isOnline();

console.log(isOnline); // true or false
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
DatabaseManager.events; // the event emitter, databaseUp or databaseDown
DatabaseManager.redis; // the redis client, returns null if redis is not connected.
DatabaseManager.redisURL; // the redis url specified
```

#### How is this useful?

You can use this to check for instance if the database is connected.

<code>TIP: If you're using redis, and redis somehow disconnects, the database will carry on until redis is reconnected.</code>

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

## Detailed Events

If you want to keep track of your events you may use.

```js
(require("pogy.db").DatabaseManager.events).on("eventName", (data) => {
  console.log(data) // the event data
}
```

#### For Mongoose

<table>
  <tr>
    <th>Event</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>databaseUp</td>
    <td>Emitted when the database is up.</td>
  </tr>
  <tr>
    <td>databaseDown</td>
    <td>Emitted when the database is down.</td>
  </tr>
</table>

#### For Redis

<table>
  <tr>
    <th>Event</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>redisConnecting</td>
    <td>Emitted when redis is connecting on startup.</td>
  </tr>
  <tr>
    <td>redisConnected</td>
    <td>Emitted when redis is ready and connected.</td>
  </tr>
    <tr>
    <td>redisEnd</td>
    <td>Emitted when redis is unexpectedly closed using `DatabaseManager.redis.disconnect()` or `DatabaseManager.redis.quit()`</td>
  </tr>
    <tr>
    <td>redisError</td>
    <td>Emitted when redis encounters an error.</td>
  </tr>
    <tr>
    <td>redisReconnecting</td>
    <td>Emitted when redis is reconnecting.</td>
  </tr>
</table>

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
            cache: {
                toggle: true,
                cacheOnly: false
            },
            logs: {
                file: "database.log",
                hidden: false
            },
            redis: {
                url: "redis://localhost:6379"
            }
        },
        {
            keepAlive: true,
            minPoolSize: 3,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 60000
        }
    );

    // every 24 hours
    cron.schedule("0 0 * * *", async () => {
        // migrate a certain table
        const migration1 = await database.migrate("users", "mongodb://localhost:27017/test2", {
            model: new mongoose.Schema({
                id: String,
                data: Object
            }) // the model of the table, this is the default one but you can change it if you wanna customize your table.
        });

        // or automatically migrate all tables
        database.DatabaseManager.tables.forEach(async (table) => {
            const migrationData = await database.migrate(table, "mongodb://localhost:27017/test2", {
                model: new mongoose.Schema({
                    id: String,
                    data: Object
                }) // the model of the table, this is the default one but you can change it if you wanna customize your table.
            });
        });
    }).start();
}

connect();
```

#### Migration Results

```ts
errors: Array<{
    error: Error | boolean;
    date: number;
    step: number;
}>; // the errors if there's any
date: number; // the date of the migration
timeTaken: number; // the time taken to migrate
table: string; // the table migrated
dataCreated: number; // the amount of data created
```

## Using Redis

To use Redis, you must have RedisJSON installed on your Redis server. RedisJSON allows us to store JSON data in Redis.

-   [RedisJSON Docs](https://github.com/RedisJSON/RedisJSON/)

run this command after instalation

```bash
redis-server --loadmodule ./target/release/librejson.so
```

## Hosting Mongo Locally

If you are hosting mongo locally you must turn your database into a Replica Set.

First, host mongo on another port ex.27018

```bash
mongod --port 27018 --replSet any-name --bind_ip localhost
```

Then, open another terminal and execute:

```bash
mongosh --port 27018
```

then

```bash
rs.initiate()
```

This will initialize your database as a replica set.

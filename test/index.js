const { DatabaseManager } = require("../lib/index");

const db = require("../lib/index"),
  url = process.argv[2].replace("--", ""),
  redis = process?.argv[3]?.replace("--", "");

async function test() {
  if (!url) {
    throw new Error(
      "A URL is required, for example node test/index.js --mongodb+srv://user:pass@cluster.domain.mongodb.net/database --redis://localhost:6379 (redis is optional). Need Help ? Visit pogy.xyz/support"
    );
  }

  const database = await db.connect(url, {
    cache: true,
    redis: {
      redis: redis ? redis : undefined,
    },
  });
  if (database) {
    console.log("Starting tests");
    let schema = await new db.table("npm-test", {
      catchErrors: true,
      cacheLargeData: true,
    });

    if (schema) {
      console.log("Created schema npm-test");

      console.log(
        await schema.set(
          "test.test",
          {
            test: "test",
          },
          { returnData: true }
        )
      );

      console.log("Added test to schema with value object {test: 'test'}");

      console.log(
        await schema.push("test.tests", "test", {
          returnData: true,
        })
      );

      console.log("Pushed test to tests array");

      console.log(await schema.get("test.tests", { returnData: true }));
      console.log("Got tests array");

      console.log(
        await schema.pull("test.tests", "test", {
          returnData: true,
        })
      );
      console.log("Pulled test from tests array");

      console.log(await schema.add("test.testCount", 1, { returnData: true }));

      console.log("Added 1 to testCount");

      console.log(
        await schema.subtract("test.testCount", 1, { returnData: true })
      );

      console.log("Subtracted 1 from testCount");

      console.log(await schema.has("test.tests"));
      console.log("Checked if tests array exists");

      console.log(await schema.all());
      console.log("Got all data");

      const ping = await db.ping({
        tableName: "npm-test",
        dataToGet: "test.tests",
      });

      console.log("Got ping!", ping);

      await schema.drop();
      console.log("Dropped schema");
    } else {
      console.log("Database is offline");
    }
  }
}

test();

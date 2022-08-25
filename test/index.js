const db = require("../lib/index"),
  url = process.argv[2].replace("--", "");

async function test() {
  if (!url) {
    throw new Error(
      "A URL is required, for example node test/index.js --mongodb+srv://user:pass@cluster.domain.mongodb.net/database. Need Help ? Visit pogy.xyz/support"
    );
  }
  const database = await db.connect(url);
  if (database) {
    console.log("Starting tests");
    let schema = await new db.table("npm-test");
    console.log("Created schema npm-test");

    await schema.set("test.test", {
      test: "test",
    });
    console.log("Added test to schema with value object {test: 'test'}");

    await schema.push("test.tests", "test");
    console.log("Pushed test to tests array");

    await schema.add("test.testCount", 1);
    console.log("Added 1 to testCount");

    await schema.subtract("test.testCount", 1);
    console.log("Subtracted 1 from testCount");

    await schema.get("test.tests");
    console.log("Got tests array");

    await schema.has("test.tests");
    console.log("Checked if tests array exists");

    await schema.delete("test.tests");
    console.log("Deleted tests array");

    await schema.all();
    console.log("Got all data");

    await schema.drop();
    console.log("Dropped schema");
  }
}

test();

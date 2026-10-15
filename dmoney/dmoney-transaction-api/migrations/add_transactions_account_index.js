require("custom-env").env("dev");
const { sequelize } = require("../sequelizeModel/db");

async function migrate() {
  const indexName = "transactions_account_index";

  try {
    await sequelize.authenticate();

    const [indexes] = await sequelize.query(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Transactions'
        AND INDEX_NAME = '${indexName}'
    `);

    if (indexes.length === 0) {
      await sequelize.query(
        `CREATE INDEX ${indexName} ON Transactions (account)`,
      );
      console.log("Added account index to Transactions.");
    } else {
      console.log("Transactions account index already exists.");
    }
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

migrate();

require("custom-env").env("dev");
const { sequelize } = require("../sequelizeModel/db");

async function migrate() {
  try {
    await sequelize.authenticate();

    const [columns] = await sequelize.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'Transactions'
              AND COLUMN_NAME = 'test_run_id'
        `);

    if (columns.length === 0) {
      await sequelize.query(`
                ALTER TABLE Transactions
                ADD COLUMN test_run_id VARCHAR(100) NULL DEFAULT NULL
            `);
      console.log("Added 'test_run_id' to Transactions.");
    } else {
      console.log("'test_run_id' already exists on Transactions.");
    }
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

migrate();

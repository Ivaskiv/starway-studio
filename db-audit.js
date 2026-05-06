const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  await client.connect();

  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);

  const columns = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);

  const safe = (rows) =>
    rows.map(r =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) =>
          typeof v === 'bigint' ? [k, Number(v)] : [k, v]
        )
      )
    );

  const result = {
    tables: safe(tables.rows),
    columns: safe(columns.rows)
  };

  console.log(JSON.stringify(result, null, 2));

  await client.end();
})();
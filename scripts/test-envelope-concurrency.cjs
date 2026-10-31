const { execFile, execFileSync } = require("node:child_process");
const { promisify } = require("node:util");
const assert = require("node:assert/strict");
const root = require("node:path").resolve(__dirname, "..");
require(root + "/node_modules/@next/env").loadEnvConfig(root);
assert.equal(
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
  "nmqlddimigebtlaophbv.supabase.co",
);
const exe = "/opt/homebrew/opt/postgresql@17/bin/psql";
const dbUrl = new URL(process.env.SUPABASE_DB_URL);
assert.ok(
  decodeURIComponent(dbUrl.username).endsWith(".nmqlddimigebtlaophbv") ||
    dbUrl.hostname === "db.nmqlddimigebtlaophbv.supabase.co",
);
Object.assign(process.env, {
  PGHOST: dbUrl.hostname,
  PGPORT: dbUrl.port || "5432",
  PGUSER: decodeURIComponent(dbUrl.username),
  PGPASSWORD: decodeURIComponent(dbUrl.password),
  PGDATABASE: decodeURIComponent(dbUrl.pathname.slice(1)),
  PGSSLMODE: dbUrl.searchParams.get("sslmode") || "require",
});
const args = ["-X", "-qAt", "-v", "ON_ERROR_STOP=1"];
const sql = (s) =>
  execFileSync(exe, [...args, "-c", s], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const query = async (s) =>
  (await promisify(execFile)(exe, [...args, "-c", s])).stdout.trim();
const owner = sql("select owner_id from budget_accounts where id=27");
assert.match(owner, /^[0-9a-f-]{36}$/);
const { randomUUID } = require("node:crypto");
const budget = Number(
  sql(
    `insert into budget_accounts(owner_id,name) values('${owner}','Disposable money command QA') returning id`,
  ),
);
const fixture = JSON.parse(
  sql(
    `with a as (insert into accounts(user_id,account_id,name,balance,account_type,include_in_totals) values('${owner}',${budget},'QA cash',100,'checking',true)), c as (insert into categories(user_id,account_id,name,monthly_amount,current_balance) values('${owner}',${budget},'QA A',50,0),('${owner}',${budget},'QA B',50,0) returning *) select json_agg(c) from c`,
  ),
);
const auth = (q) =>
  `begin; set local role authenticated; set local request.jwt.claim.sub='${owner}'; ${q}; commit;`;
const run = (command, id = randomUUID()) =>
  `select run_envelope_command(${budget},'${id}','${JSON.stringify(command)}'::jsonb)`;
(async () => {
  try {
    const [a, b] = fixture;
    const firstId = randomUUID();
    const command = {
      kind: "allocate",
      allocations: [{ categoryId: a.id, amount: 75 }],
      month: "2026-10-01",
    };
    const race = await Promise.allSettled([
      query(auth(run(command, firstId))),
      query(
        auth(
          run({ ...command, allocations: [{ categoryId: b.id, amount: 75 }] }),
        ),
      ),
    ]);
    assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      sql(
        `select sum(current_balance) from categories where account_id=${budget}`,
      ),
      "75.00",
    );
    assert.equal(
      sql(
        `select sum(funded_amount) from category_monthly_funding where account_id=${budget}`,
      ),
      "75.00",
    );
    console.log(
      "PASS concurrent allocations cannot spend the same available money",
    );
    const saved = JSON.parse(
      sql(
        `select row_to_json(o) from budget_operations o where account_id=${budget}`,
      ),
    );
    const replay = JSON.parse(
      sql(auth(run(saved.command, saved.operation_id))),
    );
    assert.deepEqual(replay.result, saved.result);
    assert.equal(
      sql(
        `select count(*) from category_balance_audit where account_id=${budget}`,
      ),
      "1",
    );
    console.log(
      "PASS replay returns original receipt with no second allocation/audit",
    );
    let mismatch = false;
    try {
      sql(
        auth(
          run({ ...saved.command, month: "2026-11-01" }, saved.operation_id),
        ),
      );
    } catch (e) {
      mismatch = true;
    }
    assert.ok(mismatch);
    const funded = JSON.parse(
      sql(
        `select row_to_json(c) from categories c where account_id=${budget} and current_balance>0`,
      ),
    );
    const empty = fixture.find((c) => c.id !== funded.id);
    const transfer = {
      kind: "transfer",
      categoryId: funded.id,
      toCategoryId: empty.id,
      amount: 20,
      expectedRevisions: {
        [funded.id]: funded.revision,
        [empty.id]: empty.revision,
      },
    };
    assert.equal(JSON.parse(sql(auth(run(transfer)))).status, "saved");
    assert.equal(JSON.parse(sql(auth(run(transfer)))).status, "conflict");
    assert.equal(
      sql(
        `select sum(current_balance) from categories where account_id=${budget}`,
      ),
      "75.00",
    );
    assert.equal(
      sql(
        `select count(*) from category_balance_audit where account_id=${budget}`,
      ),
      "3",
    );
    console.log(
      "PASS stale transfer rejected; both sides and audit remain consistent",
    );
    const current = JSON.parse(
      sql(`select row_to_json(c) from categories c where id=${funded.id}`),
    );
    const failure = sql(
      `begin; alter table category_balance_audit add constraint command_qa_failure check(account_id<>${budget}) not valid; set local role authenticated; set local request.jwt.claim.sub='${owner}'; do $$ begin perform run_envelope_command(${budget},'${randomUUID()}','${JSON.stringify({ kind: "transfer", categoryId: funded.id, toCategoryId: empty.id, amount: 10 })}'); raise exception 'Expected audit failure'; exception when check_violation then null; end $$; select current_balance from categories where id=${funded.id}; rollback;`,
    );
    assert.equal(Number(failure), current.current_balance);
    console.log("PASS audit failure rolls back both transfer balances");
    for (const amount of [0, -1, 0.001, 100000000]) {
      let rejected = false;
      try {
        sql(
          auth(
            run({
              kind: "allocate",
              allocations: [{ categoryId: a.id, amount }],
              month: "2026-10-01",
            }),
          ),
        );
      } catch (e) {
        rejected = true;
      }
      assert.ok(rejected);
    }
    const set = {
      kind: "set-balance",
      categoryId: current.id,
      amount: 99,
      expectedRevisions: { [current.id]: current.revision },
    };
    let overspend = false;
    try {
      sql(auth(run(set)));
    } catch (e) {
      overspend = true;
    }
    assert.ok(overspend);
    console.log(
      "PASS cent validation and available-money checks cover direct adjustments",
    );

    const txId = randomUUID();
    const txPatch = {
      date: "2026-10-31",
      description: "QA transaction",
      transaction_type: "expense",
      splits: [{ category_id: a.id, amount: 10 }],
    };
    const txn = (
      id,
      revision,
      patch,
      remove = false,
      operation = randomUUID(),
    ) =>
      `select save_transaction_command(${budget},${id ?? "null"},${revision ? `'${revision}'` : "null"},'${JSON.stringify(patch)}',${remove},'${operation}')`;
    const before = Number(
      sql(`select current_balance from categories where id=${a.id}`),
    );
    const created = JSON.parse(
      sql(auth(txn(null, null, txPatch, false, txId))),
    );
    assert.equal(created.status, "saved");
    assert.equal(
      Number(sql(`select current_balance from categories where id=${a.id}`)),
      before - 10,
    );
    assert.equal(
      JSON.parse(sql(auth(txn(null, null, txPatch, false, txId)))).record.id,
      created.record.id,
    );
    const tx = created.record;
    const changes = await Promise.all([
      query(
        auth(
          txn(tx.id, tx.revision, {
            splits: [{ category_id: b.id, amount: 12 }],
          }),
        ),
      ),
      query(
        auth(
          txn(tx.id, tx.revision, {
            splits: [{ category_id: b.id, amount: 14 }],
          }),
        ),
      ),
    ]);
    assert.deepEqual(changes.map((r) => JSON.parse(r).status).sort(), [
      "conflict",
      "saved",
    ]);
    const winner = changes
      .map(JSON.parse)
      .find((r) => r.status === "saved").record;
    assert.equal(
      Number(sql(`select current_balance from categories where id=${a.id}`)),
      before,
    );
    assert.equal(
      JSON.parse(sql(auth(txn(tx.id, tx.revision, {}, true)))).status,
      "conflict",
    );
    assert.equal(
      JSON.parse(sql(auth(txn(tx.id, winner.revision, {}, true)))).status,
      "saved",
    );
    assert.equal(
      Number(
        sql(
          `select sum(current_balance) from categories where account_id=${budget}`,
        ),
      ),
      75,
    );
    console.log(
      "PASS transaction creation replay, split races, stale deletion and reversal",
    );

    const guarded = (table, row, patch, remove = false) =>
      `select save_guarded_record(${budget},'${table}',${row.id},'${row.revision}','${JSON.stringify(patch)}',${remove})`;
    for (const [table, insert, field, value] of [
      [
        "loans",
        `insert into loans(account_id,user_id,name,balance) values(${budget},'${owner}','QA loan',8000) returning *`,
        "balance",
        7500,
      ],
      [
        "non_cash_assets",
        `insert into non_cash_assets(account_id,name,asset_type,current_value) values(${budget},'QA investment','other',1000) returning *`,
        "current_value",
        1100,
      ],
      [
        "income_streams",
        `insert into income_streams(account_id,name,annual_income) values(${budget},'QA income',50000) returning *`,
        "annual_income",
        52000,
      ],
    ]) {
      const row = JSON.parse(
        sql(`with r as (${insert}) select row_to_json(r) from r`),
      );
      const changed = JSON.parse(
        sql(auth(guarded(table, row, { [field]: value }))),
      );
      assert.equal(changed.status, "saved");
      assert.equal(changed.record[field], value);
      assert.equal(
        JSON.parse(sql(auth(guarded(table, row, { [field]: value + 1 }))))
          .status,
        "conflict",
      );
      assert.equal(
        JSON.parse(sql(auth(guarded(table, row, {}, true)))).status,
        "conflict",
      );
    }
    assert.equal(
      sql(
        `select count(*) from loan_balance_audit where budget_account_id=${budget}`,
      ),
      "1",
    );
    assert.equal(
      sql(
        `select count(*) from asset_value_audit where budget_account_id=${budget}`,
      ),
      "1",
    );
    console.log(
      "PASS income/loan/asset stale edits and deletes; one audit per change",
    );
    const setup = Number(
      sql(
        `insert into automatic_import_setups(account_id,user_id,source_type,source_identifier) values(${budget},'${owner}','manual','qa-${budget}') returning id`,
      ),
    );
    const batch = "qa-" + randomUUID();
    const queued = JSON.parse(
      sql(
        `with q as (insert into queued_imports(account_id,import_setup_id,source_batch_id,transaction_date,description,merchant,amount,transaction_type,hash,processing_tasks) values(${budget},${setup},'${batch}','2026-10-31','QA import','QA merchant',10,'expense','${randomUUID()}','{"duplicate_detection":false,"categorization":false}') returning *) select row_to_json(q) from q`,
      ),
    );
    const prep = [
      {
        id: queued.id,
        revision: queued.revision,
        original_data: { isDuplicate: false },
      },
    ];
    const prepare = `select save_import_preparation(${budget},'${batch}','${JSON.stringify(prep)}','duplicate_detection')`;
    const prepared = JSON.parse(sql(auth(prepare)));
    assert.equal(prepared.status, "saved");
    assert.deepEqual(
      JSON.parse(sql(auth(prepare))).revisions,
      prepared.revisions,
    );
    const revised = {
      ...queued,
      revision: prepared.revisions["queued-" + queued.id],
    };
    const item = {
      id: "queued-" + queued.id,
      queuedId: queued.id,
      expectedRevision: revised.revision,
      patch: { ...txPatch, total_amount: 10 },
    };
    const approve = (items) =>
      `select approve_import_chunk(${budget},'${batch}','${JSON.stringify(items)}')`;
    assert.equal(
      JSON.parse(
        sql(auth(approve([{ ...item, expectedRevision: queued.revision }]))),
      ).failures.length,
      1,
    );
    const approvals = await Promise.all([
      query(auth(approve([item]))),
      query(auth(approve([item]))),
    ]);
    assert.equal(
      approvals.map(JSON.parse).reduce((n, r) => n + r.imported, 0),
      1,
    );
    assert.equal(
      approvals.map(JSON.parse).reduce((n, r) => n + r.skipped, 0),
      1,
    );
    assert.equal(
      sql(
        `select count(*) from imported_transaction_links l join imported_transactions i on i.id=l.imported_transaction_id where i.account_id=${budget}`,
      ),
      "1",
    );
    assert.equal(
      JSON.parse(
        sql(
          auth(
            `select delete_import_review_rows(${budget},'${batch}','${JSON.stringify({ [queued.id]: revised.revision })}')`,
          ),
        ),
      ).status,
      "conflict",
    );
    console.log(
      "PASS checkpoint replay, stale approval, concurrent import replay, provenance and stale queue deletion",
    );
    const feature = `select save_guarded_feature(${budget},'tags',true,null)`;
    assert.equal(JSON.parse(sql(auth(feature))).status, "saved");
    assert.equal(JSON.parse(sql(auth(feature))).status, "conflict");
    console.log(
      "PASS concurrent creation of preference cannot overwrite a newer toggle",
    );
    // Resolve an abandoned request before permitting a new one. A delayed original is fenced out.
    const abandoned = randomUUID();
    assert.equal(
      JSON.parse(
        sql(auth(`select resolve_budget_operation(${budget},'${abandoned}')`)),
      ).status,
      "canceled",
    );
    let fenced = false;
    try {
      sql(
        auth(
          run(
            {
              kind: "allocate",
              allocations: [{ categoryId: a.id, amount: 1 }],
              month: "2026-10-01",
            },
            abandoned,
          ),
        ),
      );
    } catch {
      fenced = true;
    }
    assert.ok(fenced);
    assert.equal(
      JSON.parse(
        sql(
          auth(
            `select resolve_budget_operation(${budget},'${saved.operation_id}')`,
          ),
        ),
      ).status,
      "committed",
    );
    console.log(
      "PASS unknown-outcome reconciliation fences delayed requests and recognizes committed changes",
    );

    // A real buffer race must serialize against the same available-money pool.
    sql(
      `insert into user_subscriptions(account_id,user_id,tier,status) values(${budget},'${owner}','premium','active')`,
    );
    for (const name of [
      "category_types",
      "priority_system",
      "smart_allocation",
      "income_buffer",
    ])
      sql(auth(`select save_guarded_feature(${budget},'${name}',true,null)`));
    const buffer = JSON.parse(
      sql(
        `select row_to_json(c) from categories c where account_id=${budget} and is_buffer`,
      ),
    );
    assert.ok(buffer.id);
    const startingAvailable = Number(
      sql(`select budget_available_money(${budget})`),
    );
    const bufferCommand = {
      kind: "buffer-add",
      amount: Math.min(5, startingAvailable),
      expectedBalance: buffer.current_balance,
    };
    const bufferResults = await Promise.all([
      query(auth(run(bufferCommand))),
      query(auth(run(bufferCommand))),
    ]);
    assert.deepEqual(bufferResults.map((r) => JSON.parse(r).status).sort(), [
      "conflict",
      "saved",
    ]);
    const bufferNow = Number(
      sql(`select current_balance from categories where id=${buffer.id}`),
    );
    let overRelease = false;
    try {
      sql(auth(run({ kind: "buffer-release", amount: bufferNow + 1 })));
    } catch {
      overRelease = true;
    }
    assert.ok(overRelease);
    assert.equal(
      JSON.parse(
        sql(
          auth(
            run({
              kind: "buffer-release",
              amount: bufferNow,
              expectedBalance: bufferNow,
            }),
          ),
        ),
      ).status,
      "saved",
    );
    console.log("PASS buffer conflicts and authoritative release limits");

    const newBatch = "qa-" + randomUUID();
    const draft = JSON.parse(
      sql(
        `with q as(insert into queued_imports(account_id,import_setup_id,source_batch_id,transaction_date,description,merchant,amount,transaction_type,hash,processing_tasks) values(${budget},${setup},'${newBatch}','2026-10-31','QA remap','QA',12,'expense','${randomUUID()}','{"csv_mapping":true,"duplicate_detection":true}') returning *) select row_to_json(q) from q`,
      ),
    );
    const defaults = (revisions) =>
      `select save_import_defaults(${budget},'${newBatch}','${JSON.stringify(revisions)}','{"is_historical":true}')`;
    const defaultsSaved = JSON.parse(
      sql(auth(defaults({ [draft.id]: draft.revision }))),
    );
    assert.equal(defaultsSaved.status, "saved");
    assert.equal(
      JSON.parse(sql(auth(defaults({ [draft.id]: draft.revision })))).status,
      "conflict",
    );
    assert.equal(
      sql(
        `select processing_tasks->>'import_defaults_assignment' from queued_imports where id=${draft.id}`,
      ),
      "true",
    );
    const revisions = {
      [draft.id]: defaultsSaved.revisions["queued-" + draft.id],
    };
    const setupRev = sql(
      `select revision from automatic_import_setups where id=${setup}`,
    );
    const remapCommand = {
      setupRevision: setupRev,
      templateName: "QA mapping",
      columnCount: 3,
      mapping: { dateColumn: 0, descriptionColumn: 1, amountColumn: 2 },
      template: {
        date_column: 0,
        description_column: 1,
        amount_column: 2,
        amount_sign_convention: "positive_is_expense",
        date_format: "YYYY-MM-DD",
        has_headers: true,
        skip_rows: 0,
      },
      csvAnalysis: { fingerprint: "qa-" + randomUUID() },
      csvData: [
        ["date", "description", "amount"],
        ["2026-10-31", "QA", 12],
      ],
      csvFileName: "qa.csv",
      tasks: {
        csv_mapping: true,
        duplicate_detection: false,
        categorization: false,
        import_defaults_assignment: false,
      },
      transactions: [
        {
          date: "2026-10-31",
          description: "Remapped QA",
          amount: 12,
          transaction_type: "expense",
          hash: randomUUID(),
          originalData: {},
        },
      ],
    };
    const remapId = randomUUID();
    const remap = (command, id = remapId) =>
      `select remap_import_batch(${budget},'${newBatch}','${JSON.stringify(revisions)}','${JSON.stringify(command)}','${id}')`;
    const invalidRemap = {
      ...remapCommand,
      transactions: [{ ...remapCommand.transactions[0], amount: -12 }],
    };
    let remapRejected = false;
    try {
      sql(auth(remap(invalidRemap)));
    } catch {
      remapRejected = true;
    }
    assert.ok(remapRejected);
    assert.equal(
      sql(`select count(*) from queued_imports where id=${draft.id}`),
      "1",
    );
    assert.equal(
      sql(
        `select count(*) from csv_import_templates where account_id=${budget}`,
      ),
      "0",
    );
    const remapped = JSON.parse(sql(auth(remap(remapCommand))));
    assert.equal(remapped.status, "saved");
    assert.deepEqual(JSON.parse(sql(auth(remap(remapCommand)))), remapped);
    assert.equal(
      sql(
        `select count(*) from queued_imports where source_batch_id='${newBatch}' and account_id=${budget}`,
      ),
      "1",
    );
    assert.equal(
      JSON.parse(sql(auth(remap(remapCommand, randomUUID())))).status,
      "conflict",
    );
    console.log(
      "PASS import defaults CAS and remapping rollback, idempotency and stale review protection",
    );

    const integration = JSON.parse(
      sql(
        auth(
          `select save_guarded_integration(${budget},null,'{"is_enabled":false,"config":{"valuation_mode":"manual"}}')`,
        ),
      ),
    );
    assert.equal(integration.status, "saved");
    assert.equal(integration.record.has_api_key, false);
    assert.equal("encrypted_api_key" in integration.record, false);
    assert.equal(
      JSON.parse(
        sql(
          auth(
            `select save_guarded_integration(${budget},null,'{"is_enabled":false}')`,
          ),
        ),
      ).status,
      "conflict",
    );
    const teller = JSON.parse(
      sql(
        `with r as(insert into automatic_import_setups(account_id,user_id,source_type,source_identifier,source_config) values(${budget},'${owner}','teller','qa-${randomUUID()}','{}') returning *) select row_to_json(r) from r`,
      ),
    );
    const mappings = [
      {
        teller_account_id: "qa-connected",
        enabled: true,
        auto_create: true,
        account_name: "QA connected cash",
        account_type: "checking",
      },
    ];
    const saveMapping = `select save_teller_mapping(${budget},${teller.id},'${teller.revision}','${JSON.stringify(mappings)}')`;
    assert.equal(JSON.parse(sql(auth(saveMapping))).status, "saved");
    assert.equal(JSON.parse(sql(auth(saveMapping))).status, "conflict");
    assert.equal(
      sql(
        `select count(*) from accounts where account_id=${budget} and name='QA connected cash'`,
      ),
      "1",
    );
    console.log(
      "PASS integration settings CAS and Teller mapping creation cannot duplicate after a stale retry",
    );
    const settingsRevision = sql(
      `select revision from budget_resource_versions where account_id=${budget} and resource='settings'`,
    );
    const settings = `select save_guarded_budget_settings(${budget},'${settingsRevision}','[{"key":"sync_qa_setting","value":"one"}]')`;
    assert.equal(JSON.parse(sql(auth(settings))).status, "saved");
    assert.equal(JSON.parse(sql(auth(settings))).status, "conflict");
    const secondBudget = Number(
      sql(
        `insert into budget_accounts(owner_id,name) values('${owner}','Disposable settings isolation QA') returning id`,
      ),
    );
    try {
      sql(
        `insert into settings(account_id,user_id,key,value) values(${secondBudget},'${owner}','sync_qa_setting','two')`,
      );
      assert.equal(
        sql(
          `select value from settings where account_id=${budget} and key='sync_qa_setting'`,
        ),
        "one",
      );
    } finally {
      sql(`delete from budget_accounts where id=${secondBudget}`);
    }
    console.log(
      "PASS settings CAS and the same user’s settings remain isolated across households",
    );

    const categoryBefore = JSON.parse(
      sql(`select row_to_json(c) from categories c where id=${b.id}`),
    );
    const goalPayload = {
      purpose: "purchase",
      goal_type: "envelope",
      name: "QA goal",
      target_amount: 1000,
      monthly_contribution: 50,
      linked_category_id: b.id,
      creation_key: randomUUID(),
      expectedBudgetId: budget,
      expectedSourceRevisions: {
        ["categories:" + b.id]: categoryBefore.revision,
      },
    };
    sql(`update categories set monthly_amount=51 where id=${b.id}`);
    let staleGoal = false;
    try {
      sql(
        auth(
          `select create_guided_goal(${budget},'${JSON.stringify(goalPayload)}')`,
        ),
      );
    } catch {
      staleGoal = true;
    }
    assert.ok(staleGoal);
    assert.equal(
      sql(`select count(*) from goals where account_id=${budget}`),
      "0",
    );
    goalPayload.expectedSourceRevisions["categories:" + b.id] = sql(
      `select revision from categories where id=${b.id}`,
    );
    const goalId = Number(
      sql(
        auth(
          `select create_guided_goal(${budget},'${JSON.stringify(goalPayload)}')`,
        ),
      ),
    );
    assert.equal(
      Number(
        sql(
          auth(
            `select create_guided_goal(${budget},'${JSON.stringify(goalPayload)}')`,
          ),
        ),
      ),
      goalId,
    );
    const goal = JSON.parse(
      sql(`select row_to_json(g) from goals g where id=${goalId}`),
    );
    sql(`update categories set monthly_amount=52 where id=${b.id}`);
    assert.equal(
      JSON.parse(
        sql(auth(guarded("goals", goal, { monthly_contribution: 70 }))),
      ).status,
      "conflict",
    );
    const currentGoal = JSON.parse(
      sql(`select row_to_json(g) from goals g where id=${goalId}`),
    );
    assert.equal(
      JSON.parse(
        sql(auth(guarded("goals", currentGoal, { monthly_contribution: 70 }))),
      ).status,
      "saved",
    );
    assert.equal(
      Number(sql(`select monthly_amount from categories where id=${b.id}`)),
      70,
    );
    console.log(
      "PASS goal setup source checks, creation replay and atomic linked-envelope plan edits",
    );

    const tag = Number(
      sql(
        `insert into tags(account_id,user_id,name,color) values(${budget},'${owner}','QA rule tag','#777777') returning id`,
      ),
    );
    sql(
      `insert into tag_rules(account_id,user_id,tag_id,rule_type,rule_value,is_active) values(${budget},'${owner}',${tag},'description','QA automatic',true)`,
    );
    const tagged = JSON.parse(
      sql(
        auth(
          txn(null, null, {
            ...txPatch,
            description: "QA automatic rule",
            splits: [{ category_id: a.id, amount: 1 }],
          }),
        ),
      ),
    );
    assert.equal(
      sql(
        `select count(*) from transaction_tags where transaction_id=${tagged.record.id} and tag_id=${tag}`,
      ),
      "1",
    );
    console.log(
      "PASS automatic tagging remains part of the atomic transaction import",
    );
  } finally {
    sql(`delete from budget_accounts where id=${budget}`);
    console.log("Removed disposable household and financial records.");
  }
})().catch((e) => {
  console.error(e.stderr?.toString() || e.message);
  process.exit(1);
});

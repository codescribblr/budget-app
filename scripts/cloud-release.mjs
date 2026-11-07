#!/usr/bin/env node
// Node 22+; credentials come only from the process environment.
import { createHash } from "node:crypto";
import { readFile, writeFile, open, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
const [command, ...args] = process.argv.slice(2);
const configFile = process.env.CLOUD_BUILD_CONFIG || ".cloud-build.json";
const stateFile = process.env.CLOUD_RELEASE_STATE || ".cloud-release.json";
const digest = (buffer) => createHash("sha256").update(buffer).digest("hex");
const required = (name) => {
  const value = process.env[name];
  if (!value) throw Error(`${name} is required`);
  return value;
};
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
async function save(path, value) {
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
    flag: "wx",
  });
}
async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
function ciBase() {
  const url = new URL(required("CLOUD_PANEL_URL"));
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw Error("CLOUD_PANEL_URL must be an HTTPS origin");
  const app = required("CLOUD_PANEL_APP_ID");
  if (!/^\d+$/.test(app)) throw Error("Invalid app ID");
  return `${url.origin}/api/ci/apps/${app}`;
}
async function request(path, method = "GET", body, headers = {}) {
  const response = await fetch(ciBase() + path, {
    method,
    redirect: "error",
    headers: {
      Authorization: `Bearer ${required("CLOUD_PANEL_DEPLOY_TOKEN")}`,
      ...(body instanceof Uint8Array
        ? {}
        : { "Content-Type": "application/json" }),
      ...headers,
    },
    body:
      body === undefined
        ? undefined
        : body instanceof Uint8Array
          ? body
          : JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok)
    throw Error(
      `Panel ${method} ${path.split("?")[0]} failed (HTTP ${response.status}); inspect the panel release history`,
    );
  return response.json();
}
async function child(command, args, env = process.env) {
  const code = await new Promise((done, reject) => {
    const process = spawn(command, args, { stdio: "inherit", env });
    process.on("error", reject);
    process.on("exit", (code) => done(code ?? 1));
  });
  if (code !== 0) throw Error("Child command failed");
}
function mask(value) {
  if (process.env.GITHUB_ACTIONS === "true" && value)
    console.log(
      `::add-mask::${value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A")}`,
    );
}
async function poll(id, wanted) {
  const deadline = Date.now() + 30 * 60 * 1000;
  let renewAt = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    const r = await request(`/releases/${id}`);
    if (wanted.includes(r.status)) {
      console.log(`Release ${id}: ${r.status}`);
      return r;
    }
    if (
      [
        "failed",
        "aborted",
        "recovery_required",
        "finalization_failed",
      ].includes(r.status)
    )
      throw Error(`Release ${id}: ${r.status}; inspect panel and reconcile`);
    if (Date.now() > renewAt) {
      await request(`/releases/${id}/renew`, "POST", {});
      renewAt = Date.now() + 5 * 60 * 1000;
    }
    await sleep(5000);
  }
  throw Error(
    "Release wait timed out; its deployment lock remains held for reconciliation",
  );
}
async function run() {
  if (command === "config") {
    const config = await request("/build-config");
    for (const value of Object.values(config.buildEnv)) mask(value);
    await save(configFile, config);
    console.log(`Saved build configuration revision ${config.envRevision}`);
    return;
  }
  if (command === "build") {
    const config = await json(configFile);
    if (!args.length) throw Error("Supply a build command");
    for (const value of Object.values(config.buildEnv)) mask(value);
    await child(args[0], args.slice(1), { ...process.env, ...config.buildEnv });
    return;
  }
  if (command === "package") {
    const [directory, archive] = args;
    if (!directory || !archive)
      throw Error("Supply prepared standalone directory and output archive");
    const config = await json(configFile);
    const commit = required("GITHUB_SHA"),
      run = required("GITHUB_RUN_ID"),
      attempt = process.env.GITHUB_RUN_ATTEMPT || "1";
    const id =
      process.env.CLOUD_RELEASE_ID ||
      `r-${run}-${attempt}-${commit.slice(0, 12)}`;
    if (
      !/^[a-z0-9][a-z0-9_-]{7,127}$/.test(id) ||
      !/^[a-f0-9]{40}$/.test(commit) ||
      !/^\d+$/.test(run) ||
      !/^\d+$/.test(attempt)
    )
      throw Error("Invalid immutable release identity");
    const node = process.versions.node;
    if (
      node !== config.nodeVersion &&
      !node.startsWith(config.nodeVersion + ".")
    )
      throw Error("Build Node version differs from panel configuration");
    const schema = required("CLOUD_SCHEMA_GENERATION");
    const requiredEnv = (process.env.CLOUD_REQUIRED_ENV || "")
      .split(",")
      .filter(Boolean);
    if (
      !/^[\w.-]{1,80}$/.test(schema) ||
      requiredEnv.some((key) => !/^[A-Z][A-Z0-9_]*$/.test(key))
    )
      throw Error("Invalid schema generation or required variable names");
    await save(join(directory, "release.json"), {
      releaseId: id,
      commitSha: commit,
      nodeVersion: node,
      schemaGeneration: schema,
      requiredEnv,
    });
    await child("python3", [
      fileURLToPath(new URL("./package-release.py", import.meta.url)),
      directory,
      archive,
    ]);
    const bytes = await readFile(archive);
    const repository = required("GITHUB_REPOSITORY");
    await save(stateFile, {
      id,
      commitSha: commit,
      artifactSHA: digest(bytes),
      artifactBytes: bytes.length,
      envRevision: config.envRevision,
      ciRunId: run,
      ciRunUrl: `https://github.com/${repository}/actions/runs/${run}`,
      idempotencyKey: `${run}:${attempt}`,
      schemaGeneration: schema,
      archive: resolve(archive),
    });
    console.log(`Prepared immutable release ${id}`);
    return;
  }
  const state = await json(stateFile);
  const id = state.id;
  if (!/^[a-z0-9][a-z0-9_-]{7,127}$/.test(id))
    throw Error("Invalid release state");
  if (command === "stage") {
    const input = {
      id,
      commitSha: state.commitSha,
      artifactSHA256: state.artifactSHA,
      artifactBytes: state.artifactBytes,
      envRevision: state.envRevision,
      ciRunId: state.ciRunId,
      ciRunUrl: state.ciRunUrl,
      idempotencyKey: state.idempotencyKey,
      schemaGeneration: state.schemaGeneration,
    };
    const r = await request("/releases", "POST", input);
    if (r.status === "uploading") {
      const file = await open(state.archive, "r");
      try {
        if ((await file.stat()).size !== state.artifactBytes)
          throw Error("Artifact size changed");
        const chunkBytes = 8 << 20;
        for (
          let index = 0, offset = 0;
          offset < state.artifactBytes;
          index++, offset += chunkBytes
        ) {
          const chunk = Buffer.alloc(
            Math.min(chunkBytes, state.artifactBytes - offset),
          );
          const { bytesRead } = await file.read(chunk, 0, chunk.length, offset);
          if (bytesRead !== chunk.length)
            throw Error("Artifact read incomplete");
          await request(`/releases/${id}/chunks/${index}`, "PUT", chunk, {
            "Content-Type": "application/octet-stream",
            "X-Content-SHA256": digest(chunk),
          });
        }
      } finally {
        await file.close();
      }
      await request(`/releases/${id}/stage`, "POST", {});
    }
    await poll(id, [
      "staged",
      "checking",
      "ready",
      "promoting",
      "active_pending_finalize",
      "active",
    ]);
    return;
  }
  if (command === "prepare") {
    const object = process.env.CLOUD_BACKUP_OBJECT;
    const gate = required("CLOUD_MIGRATION_STATUS");
    if (
      !["completed", "not_needed"].includes(gate) ||
      (gate === "completed" && !object) ||
      (gate === "not_needed" && object)
    )
      throw Error(
        "Set explicit migration status and the matching verified backup object",
      );
    await request(
      `/releases/${id}/prepare`,
      "POST",
      object
        ? {
            migrationStatus: "completed",
            backupObject: object,
            backupVerified: true,
          }
        : { migrationStatus: "not_needed" },
    );
    await poll(id, ["ready", "promoting", "active_pending_finalize", "active"]);
    return;
  }
  if (command === "promote") {
    await request(`/releases/${id}/promote`, "POST", {});
    await poll(id, ["active_pending_finalize", "active"]);
    return;
  }
  if (command === "finalize") {
    if (args[0] && !["success", "failed"].includes(args[0]))
      throw Error("Use finalize success or finalize failed");
    const success = args[0] !== "failed";
    await request(`/releases/${id}/finalize`, "POST", { success });
    console.log(`Release ${id}: ${success ? "active" : "finalization_failed"}`);
    return;
  }
  if (["abort", "reconcile", "renew"].includes(command)) {
    await request(`/releases/${id}/${command}`, "POST", {});
    console.log(`Release ${id}: ${command} requested`);
    return;
  }
  if (command === "status") {
    const r = await request(`/releases/${id}`);
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  throw Error(
    "Usage: cloud-release.mjs config | build COMMAND... | package DIRECTORY ARCHIVE | stage | prepare | promote | finalize [failed] | status | abort | reconcile | renew",
  );
}
run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

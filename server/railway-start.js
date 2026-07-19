import path from "path";
import { spawnSync } from "child_process";

if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
  const databasePath = path.posix.join(
    process.env.RAILWAY_VOLUME_MOUNT_PATH.replaceAll("\\", "/"),
    "collab-docs.db",
  );
  process.env.DATABASE_URL = `file:${databasePath}`;
}

function run(commandArgs) {
  const result = spawnSync(process.execPath, commandArgs, {
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run(["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"]);
run(["server/prisma/seed.js"]);

const { startServer } = await import("./index.js");
await startServer();

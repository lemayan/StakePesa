const { spawnSync } = require("node:child_process")

const result = spawnSync(
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "--test", "src/e2e/admin-market-flow.test.ts"],
  {
  stdio: "inherit",
  env: {
    ...process.env,
    RUN_ADMIN_E2E_DB: "1",
  },
  }
)

if (result.error) {
  console.error("Failed to run admin e2e test", result.error)
  process.exit(1)
}

if (typeof result.status === "number") {
  process.exit(result.status)
}

process.exit(1)

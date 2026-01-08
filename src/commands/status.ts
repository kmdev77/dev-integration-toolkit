import { logger } from "../logger.js";

export async function statusCommand(): Promise<void> {
  const info = {
    name: "dev-integration-toolkit",
    node: process.version,
    env: process.env.NODE_ENV ?? "development",
    time: new Date().toISOString(),
  };

  logger.info(info, "status");
  console.log(JSON.stringify(info, null, 2));
}

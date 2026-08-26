// init-db.ts – run the Drizzle ORM migrations
import "dotenv/config";
import { execSync } from "child_process";

console.log("Running DB migrations...");
execSync("npx drizzle-kit push", { stdio: "inherit" });
console.log("DB migration complete.");

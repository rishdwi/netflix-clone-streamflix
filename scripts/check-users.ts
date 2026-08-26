import "dotenv/config";
import { connectDB } from "../src/server/db";
import { UserModel } from "../src/server/models/user.model";

async function main() {
  await connectDB();
  const users = await UserModel.find({}, { name: 1, email: 1, role: 1, createdAt: 1 });
  console.log("\n================ LIVE MONGODB USERS ================");
  users.forEach((u, i) => {
    console.log(`${i + 1}. Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Created: ${u.createdAt}`);
  });
  console.log("====================================================\n");
  process.exit(0);
}

main().catch(console.error);



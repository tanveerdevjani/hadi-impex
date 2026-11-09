import { setAdminPassword } from "./store.mjs";

const password = process.argv[2] || "";
if (password.length < 8) {
  console.error("Usage: node server/reset-admin.mjs NewPassword");
  console.error("Stop the app first, then run this. The admin username stays admin.");
  process.exit(1);
}

await setAdminPassword(password);
console.log("Admin password updated. Sign in with username admin.");

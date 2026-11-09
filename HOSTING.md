# Hadi Impex — run locally and put it on a GoDaddy domain

The website and the saved records are separate.

- Code (pages) lives in this project and can be updated from GitHub.
- Everything people enter (invoices, costing rates, quotations, purchases, payments, containers, users, and uploaded PDF/image files) lives in the `data` folder on the machine that runs the app.
- `data` is not part of Git. Updating pages does not delete users or files, as long as nobody deletes the `data` folder.

A domain name from GoDaddy does not include a place to run this app or store files. GoDaddy is used to point the name at the computer that is running the app.

## Project layout

| Folder | What it holds |
| --- | --- |
| `server/` | The Node server: sign-in, users, saved records, file uploads (`index.mjs`, `store.mjs`) and the code that serves pages 1–2 (`suite.mjs`) |
| `server/public/` | The login page and `suite-shell.js`, which adds the account area, pages 3–6, and User management to the main menu |
| `suite/` | Pages 1–2 (Invoice PDF Generator and Costing Calculations), as originally built |
| `src/` | Pages 3–6 and User management (React): `pages/`, shared `components/`, and `lib/` helpers |
| `scripts/` | `build-suite.mjs` (used by `npm run build`) and `smoke-test.mjs` (used by `npm test`) |
| `data/` | Saved records and uploads. Created on first start. Not part of Git |
| `dist/` | Output of `npm run build`. Not part of Git |

## Local check

```bash
cd hadi-impex
npm install
npm run dev
```

Open http://127.0.0.1:5173/

To test every page in one go, leave `npm run dev` running and, in a second terminal, run `npm test`. It signs in as admin, opens pages 1–6 and User management in Microsoft Edge, and checks the records API. If you changed the admin password, set it first: `set ADMIN_PASSWORD=YourPassword` (Windows) or `ADMIN_PASSWORD=YourPassword npm test` (Linux/macOS).

On the first start the terminal prints the admin username and password. The same lines are in `data/INITIAL-ADMIN.txt`. Sign in, open Users, and change that password. After a password change, sign in again.

## What is stored where

| Item | Where |
| --- | --- |
| User accounts and passwords | `data/db.json` (passwords are stored as a hash, not plain text) |
| Proforma invoices (page 1) and converter rates (page 2) | `data/db.json`, under `local` |
| Quotations (page 3), purchase orders (page 4), payments (page 5) | `data/db.json`, under `records` |
| Container and document details (page 6) | `data/db.json` |
| PDF, JPG, and PNG files | `data/uploads` (one file per document) |

About 5,000 files over 2–3 years is a normal folder. Nothing special is required beyond disk space. Each upload is limited to 10 MB, so the full set can be a few gigabytes in normal use, or up to about 50 GB if every file is the maximum size. Use a disk of at least 40 GB and keep a copy of the whole `data` folder (both `db.json` and `uploads` together).

Do not put the files in Git, and do not move them into Amazon S3 or another paid file service.

## Access

- Admin can do everything and can create, edit, and delete users (10 accounts maximum, including admin).
- Write can add, edit, and delete invoices, quotations, purchase orders, payments, containers, and documents, including the sample records.
- Read can view, print, download, export, and merge. Read cannot change records.

The site starts with a few sample records on every page so you can see how it works. Admin or Write can delete each one with its Delete button. Records added after that stay.

## GitHub

1. Create an empty private repository on your GitHub account.
2. From the `hadi-impex` folder:

```bash
git init
git add .
git status
git commit -m "Add sign-in, users, and saved documents for Hadi Impex."
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/hadi-impex.git
git push -u origin main
```

Confirm `git status` does not list `data/`. That folder holds the real records and must stay off GitHub.

## Buying the domain from GoDaddy

Buy the **domain name only**. Do not add website hosting, the website builder, WordPress, or an SSL certificate. Those cannot run this app, and the HTTPS certificate is free from the server below.

- Any ending works (`.com` is the usual choice). The name does not have to be bought before the server is ready.
- Leave the nameservers on GoDaddy’s own nameservers, so DNS is edited in the GoDaddy account.
- Domain privacy (hiding the buyer’s name in the public directory) is optional.
- After purchase, turn off domain parking and domain forwarding if GoDaddy switches them on. Nothing else is required at purchase time. The two DNS records are added in the last step, once the server has a public IP.

## Go live without a monthly hosting bill

You still pay GoDaddy for the domain only. The app runs on a free virtual server, and GoDaddy’s DNS points the domain at that server.

Oracle’s free allowance has limits to know about before you start:

- The free Ampere VM has 2 CPUs and 12 GB of memory in total. This is enough for the app. Create the VM with 2 CPUs, 12 GB, and a 50 GB boot disk.
- Free capacity is sometimes unavailable in busy regions. If creation fails with “out of capacity”, try again later or choose another home region when the account is created (the home region cannot be changed later).
- Oracle can reclaim an instance that is idle for 7 days, and can suspend an account idle for 30 days. The live site serves visitors, so it stays active. Still, sign in to the Oracle console at least once a month.
- Your 2–4 GB of documents fit comfortably in the 50 GB disk.

1. Create an Oracle Cloud always-free account and an Ampere Ubuntu VM with a boot disk of at least 50 GB.
2. In Oracle’s security list, allow inbound TCP 80 and 443. On the VM, allow those ports in the firewall as well.
3. Install Node.js 22, Git, and Caddy (Caddy gets a free HTTPS certificate).
4. Clone the GitHub repository on the VM, outside your home’s temporary folders. Example: `/opt/hadi-impex`.
5. On the VM:

```bash
cd /opt/hadi-impex
npm install
npm run build
```

6. Run it under a service account so it keeps running after the person signs out:

```bash
sudo useradd --system --home /opt/hadi-impex --shell /usr/sbin/nologin hadi
sudo chown -R hadi:hadi /opt/hadi-impex
sudo tee /etc/systemd/system/hadi-impex.service >/dev/null <<'EOF'
[Unit]
Description=Hadi Impex
After=network.target

[Service]
WorkingDirectory=/opt/hadi-impex
Environment=HOST=127.0.0.1
Environment=PORT=8080
ExecStart=/usr/bin/npm start
Restart=always
User=hadi

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now hadi-impex
sudo journalctl -u hadi-impex -n 30
```

The log prints the admin password, and the same lines are in `data/INITIAL-ADMIN.txt` on that server. It is a new password, not the one from the laptop.

7. Tell Caddy the domain, so visitors get HTTPS. Replace the name with the real domain:

```bash
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
your-domain.com, www.your-domain.com {
    reverse_proxy 127.0.0.1:8080
}
EOF
sudo systemctl reload caddy
```

8. In GoDaddy, sign in, open the domain, and edit DNS:
   - Set the A record for `@` to the VM’s public IP.
   - Set the A record for `www` to the same IP.
   - Remove domain parking or forwarding if it is turned on.
9. Wait until the name resolves, open `https://your-domain`, sign in, and change the admin password from the Users page.

## If the other person wants the app inside GoDaddy

GoDaddy shared website hosting and the website builder cannot run this app or keep a private folder of PDFs for several staff logins. They would need a GoDaddy VPS (a monthly fee) and then follow the same Node steps as above, using the VPS IP in DNS.

When they update the site later, copy the `data` folder somewhere safe first, then:

```bash
cd /opt/hadi-impex
git pull
npm install
npm run build
sudo systemctl restart hadi-impex
```

Do not delete `data`, and do not replace `data/db.json` with an older copy. The restart only reloads the pages. Records, users, and uploaded files stay where they are.

If the admin password is lost, stop the app and run:

```bash
node server/reset-admin.mjs NewPassword123
```

Then start the app and sign in as `admin`.

## Backup

Copy the entire `data` folder to a USB disk or another private place on a regular schedule. Restoring the site means putting that same `data` folder back next to the code and starting the app again.

On the Oracle server, the `data` folder lives only on that VM. Copy it off the server at least once a week, for example with `scp` to your PC, or with `rclone` to Google Drive or OneDrive (both have free space that is enough for 4 GB). Keep the backup private: it contains user password hashes and every client record.

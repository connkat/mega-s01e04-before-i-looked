---
name: preview-upload
description: Put one rig page up as a public HTML preview on Cloudflare Pages, upload over it later, and take it down. Use for a plan's "Preview for review" and "Clean up" steps (ADR 0003).
---

# preview-upload

One HTML file, one public HTTPS link, one command each to put it up, upload over it, and take
it down. Host: Cloudflare Pages (direct upload, free). ADR 0003: never put a preview in the repo,
an issue or a chat attachment.

## Needs (ask the human first)

- A Cloudflare account, and an **account API token** with only `Pages: Edit`, short expiry. The
  human creates and hands over the token; keep it in an env file outside the repo
  (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`), never in `.env`, a commit or a log.
- Network to `api.cloudflare.com` and `registry.npmjs.org` (for `npx wrangler`).
- The human's yes before the page goes public, and again before every upload over it.

Run wrangler from a folder with no `wrangler.json|jsonc|toml` in it or above it. Read each
command's `--help`; don't guess flags.

## Save the page (a command, not "save as")

```sh
# .env holds LANE_MARKER for the marked copy; unset it for the clean copy
pnpm start &                      # serves on PORT (8787)
mkdir -p /tmp/preview && curl -sf localhost:8787/digest/<night> -o /tmp/preview/index.html
grep -o 'class="marker">[^<]*' /tmp/preview/index.html   # check the banner
```

## Put it up (once per project)

```sh
npx -y wrangler@4 pages project create <project> --production-branch main --force
```

`--force` only here: wrangler 4 otherwise delegates to Workers and fails. Later commands
run against Pages without it.

## Upload (first time and every time after)

```sh
npx -y wrangler@4 pages deploy /tmp/preview --project-name <project> --branch main \
  --commit-hash <sha> --commit-message "<what>"
```

The link is `https://<project>.pages.dev/`. Each deploy also keeps its own link
`https://<id>.<project>.pages.dev`, so uploading over the main link does not remove an older
copy. After a clean upload, delete every older deployment:

```sh
npx -y wrangler@4 pages deployment list --project-name <project> --json
npx -y wrangler@4 pages deployment delete <deployment-id> --project-name <project>
```

`-f` only if wrangler says the deployment still has an active alias. Then open both the main link and the old deployment links and check the banner.

## Take it down

```sh
npx -y wrangler@4 pages project delete <project> --yes
```

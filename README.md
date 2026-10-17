# Houcine | Notes & Experiments

A lightweight personal website for writing, project notes, and small research exercises. Current public work includes an AI-assisted research program on arguments about ultimate reality and a desk-research exercise on Tunisian olive oil in Singapore.

The site identifies the difference between documented facts, estimates, questions, and results that have not been tested. It does not claim formal qualifications, offer professional advice, or present the market-entry exercise as a validated business opportunity.

## Requirements

- Node.js 18 or newer
- No package installation is needed. The build uses Node's built-in modules.

## Run locally

```sh
npm run dev
```

Open <http://localhost:4321>. Stop the local server with `Ctrl+C`.

## Build

```sh
npm run build
```

The complete static site is written to `dist/`. The build generates the HTML pages, page-specific JSON-LD structured data, a sitemap, `robots.txt`, `llms.txt`, and an RSS feed at `feed.xml`.

## Content and site information

- `site.config.mjs` controls the site name, public URL, author description, intended audience, publishing schedule, free-access policy, newsletter status, submission status, homepage, and About page.
- `content/writing/` contains writing entries in Markdown.
- `content/projects/` contains project pages in Markdown.
- `content/now.md` is the editable source for the `/now/` page. Keep it current when your study or project priorities change.
- `draft: true` keeps an entry out of the published site, search index, sitemap, RSS feed, and AI-readable index.
- A project `status` can be `exploring`, `in-progress`, `experiment`, `completed`, or `archived`.

Keep front matter fields `title`, `description`, and `date` on every entry. Use `updated` only when the page has materially changed. Do not add structured claims about credentials, products, paywalls, or business results unless they are true and visible on the page.

## Generated discovery files

- `/sitemap.xml` lists the homepage, key pages, and published content.
- `/robots.txt` allows ordinary search crawling and explicitly permits AI retrieval agents including `OAI-SearchBot`, `Claude-SearchBot`, and `PerplexityBot`. It blocks training-focused crawlers such as `GPTBot` and `ClaudeBot`. `Google-Extended` is allowed to support grounding in Gemini Apps; Google's documented policy also covers model-training use, so this is an intentional discoverability-versus-training trade-off.
- `/llms.txt` is a concise map of the site for tools that choose to read the proposed convention. It is not a ranking guarantee and should not be described as one.
- `/feed.xml` is a free RSS feed for recent published writing. It is not an email newsletter.
- JSON-LD identifies the author as a `Person`, the website as a `WebSite`, essays as `BlogPosting`, project pages as `CreativeWork` or `SoftwareSourceCode`, and the FAQ as an `FAQPage`. Markup is generated from visible content; it should stay in sync with the page.

No `Product` schema is used because this site does not sell a product. Topic archives combine categories and tags, and are generated only when at least two distinct public pages share a term, avoiding thin one-item archive pages. The site does not currently have a newsletter, membership, paywall, paid tier, guest-post program, public contact email, or general submission form.

## Deploy to the existing Cloudflare Worker

The public URL is `https://houcine-notes.hssinmbarek6.workers.dev`. `wrangler.jsonc` names the Worker `houcine-notes` and serves the generated `dist/` directory as static assets.

To enable automatic deployments from GitHub, open Cloudflare Dashboard → **Workers & Pages** → select the existing **houcine-notes** Worker → **Settings** → **Builds** → **Connect**. Connect the repository `TheSunNeverRose/houcine-personal-site` and use `main` as the production branch. Set the build command to `npm run build` and the deploy command to `npx wrangler deploy`. Keep the root directory blank.

A GitHub push triggers a Cloudflare deployment only after this Git integration is connected. After the first build, check the deployment status and visit `/faq/`, `/feed.xml`, and `/llms.txt` on the live URL to confirm that the new version is being served.

## Notes

The site has no database, login system, analytics, or third-party runtime dependencies. Search runs against a generated local content index. The public email field is intentionally blank. The footer links to the author's GitHub profile; the Ultimate Reality Researcher project links directly to its own repository from the project page.

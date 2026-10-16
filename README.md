# Houcine | Notes & Experiments

A lightweight, dependency-free personal website with a dark editorial design, responsive layouts, Markdown writing and project pages, category filters, and client-side search. The public projects focus on the Ultimate Reality Researcher codebase and a sourced desk-research exercise on Tunisian olive oil in Singapore.

The site separates what is documented from what remains unknown. The market-entry page cites public trade and regulatory sources; it does not claim buyer interviews, field research, or a validated business opportunity. The research-agent page records an implementation issue found during source inspection rather than presenting the project as more reliable than it is. Older negotiation and generic business-concept drafts are kept unpublished to avoid listing checklists as finished projects.

## Requirements

- Node.js 18 or newer
- No package installation is needed; the site uses Node's built-in modules.

## Run locally

From this directory:

```sh
npm run dev
```

Open <http://localhost:4321>. The preview server rebuilds the site when pages are requested. Stop it with `Ctrl+C`.

## Build for publishing

```sh
npm run build
```

The complete static website is written to `dist/`. Publish the **contents** of `dist/`, not the source directory, to a static hosting provider.

## Personalise the site

Most homepage and About text is in `site.config.mjs`. Edit the values there to change:

- Name and site title
- Hero headline and introduction
- Areas of interest
- Current focus
- About-page introduction, questions, learning goals, and direction
- Contact email and social links
- Production URL and optional hosting sub-path

The site currently uses the first name `Houcine`. Add a public email only if you want it visible. The GitHub footer link points to the Ultimate Reality Researcher repository; change it in `site.config.mjs` if you prefer another public profile.

## Add a writing entry

Create a Markdown file in `content/writing/`, for example `content/writing/my-new-note.md`:

```md
---
title: A clear title
description: A one-sentence summary.
date: 2026-10-20
category: Business
tags: [strategy, learning]
featured: false
---

Your article in Markdown.

## A section

Write your thoughts here. Add links and a list when useful.
```

The filename becomes the URL slug. Use lowercase letters, numbers, and hyphens. Supported Markdown includes paragraphs, `##`/`###` headings, lists, blockquotes, tables, links, images, inline emphasis, and fenced code blocks. Keep research sources and important qualifications in the article itself.

Add `draft: true` to keep a draft out of the public site, search index, and sitemap. Remove that flag when it is ready to publish.

## Add a project

Create a Markdown file in `content/projects/`. Use the same fields as an article, plus a `status` value:

- `exploring`
- `in-progress`
- `experiment`
- `completed`
- `archived`

Useful optional headings include `The question`, `Why it matters`, `Hypothesis`, `Research and method`, `Process`, `Results`, `Limitations`, `Lessons learned`, `Next steps`, and `Sources`. Sections that are not needed can be omitted. Label estimates and hypotheses as such; don't present a plan as a result.

## Domain and deployment

1. Choose a static host such as GitHub Pages, Cloudflare Pages, or Netlify.
2. Set `url` in `site.config.mjs` to the final public URL. This enables canonical URLs and `sitemap.xml`.
3. Set `base` only if the site is hosted below a path, such as `/repository-name` on a GitHub Pages project site. Leave it empty for a root domain or root-level site.
4. Run `npm run build` and publish the generated `dist/` directory.

For Cloudflare Pages or Netlify, the build command is `npm run build` and the output directory is `dist`. A GitHub Pages setup needs a workflow that installs Node and runs the build before publishing `dist/`.

## Notes

- The website has no database, account system, analytics, advertisements, or third-party runtime dependencies.
- Search runs locally against the generated content index.
- No contact form is included; an email link appears only when a real email address is configured.
- Canonical URLs and the sitemap are intentionally omitted until the production URL is known.

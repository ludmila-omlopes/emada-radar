# Skills directory

The public `/skills` route negotiates Portuguese or English, like the other portal routes. The catalog lives in `src/data/agent-skills.ts`; descriptions are editorial summaries in both languages. No account, database migration or runtime external request is needed by the directory itself.

## Research snapshot: 2026-09-25

- Repository stars were retrieved from `https://api.github.com/repos/{owner}/{repo}`. These measure repository-wide interest, not individual skill ratings. All 14 selected repositories were unarchived when checked.
- Approximate all-time install counts came from [Skills.sh](https://skills.sh/). Preserve their approximate nature; they are not unique user counts, review scores or evidence of effectiveness.
- Individual source paths and names were checked against the repositories' Git trees and `SKILL.md` files. The catalog links to each source and its Skills.sh entry.
- The selection considers adoption, identifiable maintainers, documented purpose and coverage of practical tasks. It is not an exhaustive ranking or an independent quality/security audit.
- “Official” is reserved here for first-party product organizations (Anthropic, Vercel, OpenAI and Supabase); it is not an endorsement of results.
- [VoltAgent’s directory](https://github.com/VoltAgent/awesome-agent-skills) and [Composio’s directory](https://github.com/ComposioHQ/awesome-claude-skills) are labeled as directories, rather than individual installable skills.
- K-Dense’s old `claude-scientific-skills` URL redirects to `K-Dense-AI/scientific-agent-skills`; the catalog uses the canonical repository name.
- `grill-me` currently invokes `grilling`, so its install command selects both. Agent Browser requires its CLI and browser dependencies. Consult author instructions for runtime requirements and licenses, particularly document skills.

## Updating the selection

Recheck the original repositories, individual skill paths and [Skills.sh](https://skills.sh/) entries before changing descriptions or counters. Use the `name` in each skill's front matter for CLI commands; it can differ from the directory name (for example `vercel-react-best-practices`). Follow [Skills CLI documentation](https://github.com/vercel-labs/skills#readme) for current syntax.

Update `skillsReviewedAt`, counters and the date in the `Skills.installsSource` and `Skills.starsSource` messages together. Never stamp a new date without reviewing the data. Add corresponding Portuguese and English copy and check external links. Collection stars and skill installs remain separate metrics.

## Validation

Run lint, typecheck and localization tests. Check both localized routes, the bare-route redirect, navigation, combined search/category/official filters, sort order, empty-state reset, installation disclosure, clipboard feedback and narrow-screen layout. Production compilation can be checked with `npx next build`; the broader `npm run build` pipeline also contains pre-existing service checks and content-seeding steps.

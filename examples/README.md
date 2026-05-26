# Examples

Sample agents and skills shipped with this fork. Useful as starting points for
new BB1 projects or as imports into an existing Studio.

## Skills

| File | What it is |
|---|---|
| `skills/commercial-journey-analysis.md` | A 3-stage methodology for analysing a client's commercial journey across human and AI/agent customers. Used by the BB1 Commercial Journey Analyst agent. |

## How to import into Studio

Open Studio, go to **Skills → New Skill → Import**, and paste a raw GitHub URL
into the "Or paste URL" field. Examples:

```
https://raw.githubusercontent.com/emilianojuandept/bmad-studio/main/examples/skills/commercial-journey-analysis.md
```

Studio fetches the file, parses the frontmatter, and switches to the Create
tab pre-populated. Pick the Parent Module and click Create Skill.

Alternatively, clone the fork and drop the `.md` into the upload area of the
Import dialog.

## Adding new examples

Drop new `.md` files (with valid BMAD frontmatter: `name`, `description`)
under `examples/skills/`. Open a pull request to share with the team.

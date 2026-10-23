---
title: "Issue tracker: GitHub"
description: "Read and manage GitHub Issues for React Fabrio."
---

Issues and specs live in GitHub Issues for `Imunal/react-fabrio`.
Use the `gh` CLI from this repo.

## Conventions

- Create: `gh issue create --title "..." --body-file <file>`.
- Read: `gh issue view <number> --json number,title,body,labels,comments`.
- List: `gh issue list --state open --json number,title,body,labels`.
- Comment: `gh issue comment <number> --body-file <file>`.
- Apply labels: `gh issue edit <number> --add-label "<label>"`.
- Remove labels: `gh issue edit <number> --remove-label "<label>"`.
- Close: `gh issue close <number> --comment "..."`.

For multiline content, write the exact text to a temporary file
and pass it with `--body-file`.

Link child tickets using GitHub sub-issues when available.
Otherwise, put `Part of #<parent>` at the top of the child body
and add a task-list entry to the parent.

Represent blockers with GitHub issue dependencies when available.
Otherwise, put `Blocked by: #<number>` at the top of the ticket.
A ticket is unblocked when all blockers are closed.

## Pull requests as a triage surface

Use issues for requests, not pull requests.

## Skill instructions

"Publish to the issue tracker" means create a GitHub issue.
"Fetch the relevant ticket" means read the GitHub issue.

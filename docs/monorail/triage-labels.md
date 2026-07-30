# Triage labels

Use this minimal canonical mapping for the triage state machine. The canonical role and GitHub label are intentionally identical.

| Canonical role    | GitHub label      | Meaning                                                                                             |
| ----------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| `needs-triage`    | `needs-triage`    | A maintainer needs to evaluate the issue.                                                           |
| `needs-info`      | `needs-info`      | Progress is waiting on information from the reporter.                                               |
| `ready-for-agent` | `ready-for-agent` | The issue is fully specified and can be completed by an AFK agent without additional human context. |
| `ready-for-human` | `ready-for-human` | The issue is valid but needs human implementation or judgment.                                      |
| `wontfix`         | `wontfix`         | The issue will not be actioned.                                                                     |

## Repository state

The repository already has `wontfix`. At setup time it did not have the other four canonical labels and had no conflicting project-specific triage vocabulary.

Before applying a missing canonical label, create it in GitHub with the exact name above. Do not create aliases or apply more than one terminal state (`ready-for-agent`, `ready-for-human`, or `wontfix`) at the same time.

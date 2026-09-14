<!-- Guidelines: CONTRIBUTING.md#opening-a-pull-request -->

## Summary

<!-- The problem, and why this change is needed now. Link the ticket if there is one. -->

## What changed

<!-- What an agent will do differently after reading the new text. -->

## Dependencies and merge order

<!-- Backend pull request or release this documentation relies on, and whether it is deployed. Write "None" if there are none. -->

## Verification

- [ ] `node --test test/*.test.mjs`
- [ ] `node scripts/check-folder-discovery-contract.mjs`
- [ ] `git diff --check`

<!-- How you confirmed the documented behavior: a request against the production API, or the backend code and the release that contains it. -->

## Downstream impact

<!-- Do distributions that pin this repository need to re-pin to pick this up? Did a skill get added, renamed, or removed? -->

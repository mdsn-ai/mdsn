# MDSN Agent Notes

## Definition

MDSN is the interaction structure layer of a Markdown-native page.

- `Markdown` carries the page body
- `MDSN` carries the page interaction structure
- humans and agents consume the same page source through different hosts

## Current Core

Current core objects:

- `block`
- `input`
- `read`
- `write`
- `view`
- `flow`

Constraint object:

- `schema`

## Roles

- `block`
  - interaction scope
- `input`
  - input definition
- `read`
  - read-only operation
- `write`
  - mutating operation
- `view`
  - result reading hint and Markdown result anchor binding
- `flow`
  - optional ordering of blocks
- `schema`
  - JSON structure constraint for `json` typed values

## Key Rules

- `flow` directly orders blocks
- `block` is the primary scope unit
- `json` typed inputs and results require `schema`
- `block` and `view` are currently anchored in Markdown with comments

## Agent View

Minimal execution loop:

`input -> read|write -> result`

`view` helps the agent understand how to read the result.

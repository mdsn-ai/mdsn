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
- `GET` operation
- `POST` operation

## Roles

- `block`
  - interaction scope
- `input`
  - input definition
- `GET`
  - read operation
- `POST`
  - mutating operation

## Key Rules

- `block` is the primary scope unit
- interaction declarations stay inside a single `mdsn` block
- page updates are driven by Markdown fragments returned from `GET` / `POST`

## Agent View

Minimal execution loop:

`input -> GET|POST -> next Markdown fragment`

# SDK 0.4.3 Release Notes

## Fixed

`@mdsnai/sdk@0.4.3` fixes static asset serving for host adapters when files are mounted at the root path.

Both the Node and Bun adapters now resolve requests like `/favicon.ico` or `/robots.txt` correctly when the static mount prefix is `/`.

## Coverage

This release also adds focused regression coverage for:

- root-mounted static file serving in the Node host adapter
- root-mounted static file serving in the Bun host adapter

# Attribution

Kobolar is an independent open-source project inspired by Polar.

## Derived code

The following packages were adapted from [Polar](https://github.com/polarsource/polar),
licensed under the Apache License, Version 2.0 (see `LICENSE`):

| Package | Origin | Adaptations |
|---|---|---|
| `packages/orbit` | `clients/packages/orbit` | Rebranded design tokens, Kobolar palette, replaced commercial font with SIL OFL fonts |
| `packages/ui` | `clients/packages/ui` | Removed Polar-specific assumptions where applicable |
| `packages/currency` | `clients/packages/currency` | — |
| `packages/i18n` | `clients/packages/i18n` | Strings to be revised for Kobolar |
| `packages/typescript-config` | `clients/packages/typescript-config` | — |

The build configuration (`babel.config.js`, `postcss.config.mjs`) is adapted from
Polar's Next.js app to support StyleX.

## Fonts

- Inter, InterDisplay, Geist Mono — SIL Open Font License. Distributed in `public/fonts/`.
- PP Neue Montreal is a commercial font. It is **not** used or distributed by Kobolar.

## Trademarks

"Polar" and its logos are trademarks of Polar Software Inc. Kobolar is not
affiliated with or endorsed by Polar. Apache License 2.0 Section 6 does not
grant permission to use Polar's trade names, trademarks, service marks or
product names. All Polar branding and "Powered by" attributions have been
removed from the adapted code.

## Merchant of Record

Kobolar does not provide Merchant-of-Record status, tax compliance or global
payment acceptance. The business operating a Kobolar installation remains
responsible for its own legal, tax and payment-provider obligations.

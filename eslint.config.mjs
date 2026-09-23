// Flat ESLint config built on Nuxt's integration (@nuxt/eslint). The base
// config is generated into .nuxt/ during `nuxt prepare`. Correctness/linting
// only — formatting is delegated to Prettier (stylistic rules are disabled in
// nuxt.config.ts).
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  // Project-specific rule overrides go here as the codebase grows.
})

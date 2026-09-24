// Flat ESLint config built on Nuxt's integration (@nuxt/eslint). The base
// config is generated into .nuxt/ during `nuxt prepare`. Correctness/linting
// only — formatting is delegated to Prettier (stylistic rules are disabled in
// nuxt.config.ts).
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Formatting is owned by Prettier; disable the stylistic Vue rule that
    // conflicts with Prettier's void-element formatting (<img />).
    'vue/html-self-closing': 'off',
  },
})

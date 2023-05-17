module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module',
    ecmaFeatures: {
      legacyDecorators: true
    }
  },
  extends: [
    'standard'
  ],
  plugins: [
    'mocha'
  ],
  rules: {
    'object-curly-spacing': ['warn', 'always'],
    quotes: ['warn', 'single'],
    'comma-dangle': ['warn', 'never'],
    'mocha/no-exclusive-tests': 'error'
  },
  globals: {
    beforeEach: 'readonly',
    afterEach: 'readonly',
    it: 'readonly',
    describe: 'readonly'
  }
}

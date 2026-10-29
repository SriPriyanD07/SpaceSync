process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'spacesync_test_suite_jwt_signing_secret_key_2026_safe';
process.env.MFA_ENCRYPTION_KEY = 'spacesync_test_suite_mfa_encryption_key_2026_safe';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};

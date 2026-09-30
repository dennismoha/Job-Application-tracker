import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '../src/shared/security/password.js';

describe('password hashing', () => {
  it('verifies the original password and rejects a different one', async () => {
    const hash = await hashPassword('a-long-development-password');

    await expect(verifyPassword('a-long-development-password', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});

/**
 * Test Setup
 *
 * Configures testing environment.
 */

import '@testing-library/jest-dom';

// MSW has been removed. Tests now use the real .NET Mock API on localhost:5180
// If tests need mocking, consider using nock or msw@browser for API mocking

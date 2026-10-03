require('./helpers');
const { slugify } = require('../src/services/content');
const v = require('../src/validators');
const { publicUser, authorView, pageResult } = require('../src/utils/http');
test.each([
  ['Hello, World!', 'hello-world'],
  ['Café & Crème', 'cafe-creme'],
  ['你好', 'story'],
  ['---', 'story'],
])('slugifies %s', (title, expected) => expect(slugify(title)).toBe(expected));
test('slug length is bounded', () => expect(slugify('a'.repeat(200))).toHaveLength(100));
test('password validation respects bcrypt UTF-8 byte limit', () =>
  expect(
    v.register.safeParse({ name: 'Reader', email: 'a@example.com', password: '🙂'.repeat(30) })
      .success,
  ).toBe(false));
test('pagination and empty admin patches are bounded', () => {
  expect(v.page.parse({})).toEqual({ page: 1, limit: 9 });
  expect(v.page.safeParse({ page: 1.2 }).success).toBe(false);
  expect(v.userUpdate.safeParse({}).success).toBe(false);
});
test('deleted authors remain anonymous and pagination handles empty results', () => {
  expect(authorView(null).name).toBe('Deleted account');
  expect(
    publicUser({ _id: '1', name: 'Private', email: 'private@example.com', deletedAt: new Date() })
      .email,
  ).toBeUndefined();
  expect(pageResult([], 0, 1, 9).pagination.pages).toBe(0);
});

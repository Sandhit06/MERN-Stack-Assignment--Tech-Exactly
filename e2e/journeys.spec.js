const { test, expect } = require('@playwright/test');
test('reader can browse, sees safe text and an intentional 404', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A little room for thought.' })).toBeVisible();
  await page
    .getByRole('heading', { name: 'Welcome to the reading room' })
    .getByRole('link')
    .click();
  await expect(page.getByRole('heading', { name: 'The conversation' })).toBeVisible();
  await expect(page.getByText('Sign in to join in')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Let’s turn back.' })).toBeVisible();
});
test('writer registers, publishes, edits, comments, restores session and deletes', async ({
  page,
}, info) => {
  const suffix = `${info.project.name}-${Date.now()}`;
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Browser Writer');
  await page.getByLabel('Email address').fill(`writer-${suffix}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('browser-password-123');
  await page.getByRole('button', { name: 'Create your account' }).click();
  await expect(page.getByRole('link', { name: 'Write a story' })).toBeVisible();
  await page.getByRole('link', { name: 'Write a story' }).click();
  await page.getByLabel('Story title').fill(`Browser story ${suffix}`);
  await page
    .getByLabel('Story content')
    .fill(
      'A real story created through the browser. <script>window.injected=true</script>\n\nA second paragraph, with room for thought.',
    );
  await page.getByRole('button', { name: 'Publish story' }).click();
  await expect(page.getByRole('heading', { name: `Browser story ${suffix}` })).toBeVisible();
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Edit story' })).toBeVisible();
  await page.getByRole('link', { name: 'Edit story' }).click();
  await page.getByLabel('Story title').fill(`Revised story ${suffix}`);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: `Revised story ${suffix}` })).toBeVisible();
  await page.getByLabel('Add your perspective').fill('My first thoughtful comment.');
  await page.getByRole('button', { name: 'Post comment' }).click();
  await expect(page.getByText('My first thoughtful comment.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit comment by Browser Writer' }).click();
  await page.getByLabel('Edit comment', { exact: true }).fill('A revised thoughtful comment.');
  await page.getByRole('button', { name: 'Save comment' }).click();
  await expect(page.getByText('A revised thoughtful comment.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete comment by Browser Writer' }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByText('A revised thoughtful comment.', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete story', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Words with your name on them.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.goto('/write');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
});
test('admin can moderate another author and protect the last admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('editor@example.test');
  await page.getByLabel('Password', { exact: true }).fill('e2e-editor-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: 'A thoughtful space, well looked after.' }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'People' }).click();
  const row = page.getByRole('row').filter({ hasText: 'Test Editor' });
  await row.getByRole('button', { name: 'Make user' }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Keep at least one active admin.');
  await page.getByRole('tab', { name: 'Stories' }).click();
  await page.getByRole('link', { name: 'Edit Welcome to the reading room' }).click();
  await page
    .getByLabel('Story content')
    .fill('An editor has refined this public story. It remains attributed to its original author.');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByText(
      'An editor has refined this public story. It remains attributed to its original author.',
    ),
  ).toBeVisible();
});

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { AUTH_FILE, type E2EAuth } from './global-setup';

// A 1x1 transparent PNG: enough for the browser's canvas-based photo
// pipeline (lib/images/prepare-photo.ts) to decode and re-encode as webp.
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const auth: E2EAuth = JSON.parse(readFileSync(AUTH_FILE, 'utf8'));

// Tagged with the run id so global-teardown.ts can find and delete it even
// if this test fails partway through its own cleanup.
const carVariant = `E2E ${auth.runId} SX Petrol Manual`;
const leadName = `E2E Lead ${auth.runId}`;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('admin adds, publishes and sells a car; a public visitor finds it and enquires', async ({ page }) => {
  const testImagePath = path.join(mkdtempSync(path.join(tmpdir(), 'e2e-photo-')), 'photo.png');
  writeFileSync(testImagePath, ONE_PIXEL_PNG);

  let carEditUrl = '';
  let carDetailUrl = '';

  await test.step('admin logs in', async () => {
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill(auth.email);
    await page.getByLabel('Password').fill(auth.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/admin');
  });

  await test.step('add a car with a photo and publish it', async () => {
    await page.goto('/admin/cars/new');

    const brand = page.getByRole('combobox', { name: 'Brand' });
    await brand.click();
    await brand.fill('Hyundai');
    await page.getByRole('option', { name: 'Hyundai' }).click();

    const model = page.getByRole('combobox', { name: 'Model' });
    await model.click();
    await model.fill('Creta');
    await page.getByRole('option', { name: 'Creta' }).click();

    await page.getByLabel('Variant').fill(carVariant);
    await page.getByLabel('Selling price (₹)').fill('1250000');
    await page.getByLabel('Year').selectOption('2022');
    await page.getByLabel('Kilometres driven').fill('28000');
    await page.getByRole('radio', { name: 'Petrol' }).check({ force: true });
    await page.getByRole('radio', { name: 'Manual' }).check({ force: true });
    await page.getByRole('radio', { name: 'SUV' }).check({ force: true });

    // The visible "Choose photos" button opens a hidden, non-capture file input.
    await page.locator('input[type="file"]:not([capture])').setInputFiles(testImagePath);
    // SaveBar's live status note reads "Uploading 1 photo…" until the upload finishes.
    await expect(page.locator('span[aria-live="polite"]')).not.toHaveText(/Uploading/, { timeout: 20_000 });

    await page.getByRole('button', { name: 'Publish' }).click();
    await page.waitForURL(/\/admin\/cars\/.+\/edit/, { timeout: 20_000 });
    await expect(page.getByTestId('car-status')).toHaveText('Published');
    carEditUrl = page.url();
  });

  await test.step('appears on /cars and on the matching brand filter', async () => {
    await page.goto('/cars/brand/hyundai');
    await expect(page.getByRole('link', { name: new RegExp(escapeRegExp(carVariant)) })).toBeVisible();

    await page.goto('/cars');
    const link = page.getByRole('link', { name: new RegExp(escapeRegExp(carVariant)) }).first();
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL(/\/cars\/[^/]+$/);
    carDetailUrl = page.url();
  });

  await test.step('a visitor submits a lead from the detail page', async () => {
    await page.getByRole('button', { name: 'Enquire Now' }).click();
    await page.getByLabel('Name').fill(leadName);
    await page.getByLabel('Mobile number').fill('9812345670');
    await page.getByRole('button', { name: 'Send enquiry' }).click();
    await expect(page.getByText(/We.ve got your enquiry/)).toBeVisible();
  });

  await test.step('the lead appears in /admin/leads', async () => {
    await page.goto('/admin/leads');
    await page.getByPlaceholder('Search name or phone').fill(leadName);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: leadName })).toBeVisible();
  });

  await test.step('mark the car sold', async () => {
    await page.goto(carEditUrl);
    await page.getByRole('button', { name: 'Status' }).click();
    await page.getByRole('button', { name: /^Mark sold/ }).click();
    await page.getByRole('button', { name: 'Mark sold', exact: true }).click();
    await expect(page.getByTestId('car-status')).toHaveText('Sold');
  });

  await test.step('it leaves /cars and its old URL says sold', async () => {
    await page.goto('/cars');
    await expect(page.getByRole('link', { name: new RegExp(escapeRegExp(carVariant)) })).toHaveCount(0);

    const response = await page.goto(carDetailUrl);
    expect(response?.status()).toBe(410);
    await expect(page.getByRole('heading', { name: /has been sold/ })).toBeVisible();
  });
});

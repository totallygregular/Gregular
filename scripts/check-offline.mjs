import {chromium} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});
try {
  const page=await browser.newPage();const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.goto(pathToFileURL(resolve('artifacts/Briarwick - Playable Preview.html')).href);
  const travel=async loc=>{const b=page.locator(`[data-travel="${loc}"]`);if(await b.getAttribute('aria-current')!=='page')await b.click();};
  const act=id=>page.locator(`[data-action="${id}"]`).click();
  await page.locator('[data-job="pie"]').click();await travel('inn');await act('inspect:pie');await travel('marsh');await act('inspect:basket');await act('finish:pie:share');
  await travel('square');await page.locator('[data-job="bell"]').click();await travel('tower');await act('inspect:bell');await travel('marsh');await act('inspect:nest');await act('finish:bell:gentle');
  await travel('square');await page.locator('[data-job="mill"]').click();await travel('mill');await act('inspect:mill');await act('inspect:toolbox');await act('finish:mill:repair');
  assert.equal(await page.locator('#job-count').textContent(),'3 / 3');await travel('square');await act('after:meeting');
  assert.match(await page.locator('#event-text').textContent(),/You came looking for work/);
  await travel('inn');await act('rest:morning');await page.reload();
  assert.match(await page.locator('#day-label').textContent(),/Day 2/);assert.equal(await page.locator('#job-count').textContent(),'3 / 3');
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  console.log('Offline file passed: three jobs, ending, next morning, reload; zero HTTP requests or browser errors.');
} finally {await browser.close();}

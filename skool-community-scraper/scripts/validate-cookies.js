#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const COOKIES_PATH = path.join(PROJECT_ROOT, 'cookies.json');

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

const args = process.argv.slice(2);
const shouldValidate = args.includes('--validate');
const shouldConvert = args.includes('--convert');
const inputFile = args.find(a => !a.startsWith('-'));

// ─── Cookie Format Detection & Conversion ────────────────────────────────────

function detectFormat(cookies) {
  if (!Array.isArray(cookies) || cookies.length === 0) {
    return 'unknown';
  }

  const sample = cookies[0];

  // Playwright format: uses "expires"
  if ('expires' in sample && !('expirationDate' in sample)) {
    return 'playwright';
  }

  // Cookie-Editor / EditThisCookie format: uses "expirationDate"
  if ('expirationDate' in sample) {
    return 'cookie-editor';
  }

  // Minimal format (just name/value/domain)
  if ('name' in sample && 'value' in sample && 'domain' in sample) {
    return 'minimal';
  }

  return 'unknown';
}

function convertToPlaywright(cookies, sourceFormat) {
  return cookies.map(cookie => {
    const pw = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
    };

    // Handle secure flag
    if ('secure' in cookie) pw.secure = cookie.secure;
    if ('httpOnly' in cookie) pw.httpOnly = cookie.httpOnly;

    // Handle sameSite - Playwright expects capitalized values
    if (cookie.sameSite) {
      const sameSite = cookie.sameSite.toLowerCase();
      if (sameSite === 'lax') pw.sameSite = 'Lax';
      else if (sameSite === 'strict') pw.sameSite = 'Strict';
      else if (sameSite === 'none') pw.sameSite = 'None';
      else pw.sameSite = 'Lax'; // default
    }

    // Handle expiration
    if (sourceFormat === 'cookie-editor' && cookie.expirationDate) {
      pw.expires = cookie.expirationDate;
    } else if (cookie.expires) {
      pw.expires = cookie.expires;
    } else if (cookie.expirationDate) {
      pw.expires = cookie.expirationDate;
    } else {
      pw.expires = -1; // session cookie
    }

    return pw;
  });
}

function parseNetscapeCookies(text) {
  const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  return lines.map(line => {
    const parts = line.split('\t');
    if (parts.length < 7) return null;
    return {
      domain: parts[0],
      httpOnly: parts[0].startsWith('#HttpOnly_') ? true : false,
      path: parts[2],
      secure: parts[3].toUpperCase() === 'TRUE',
      expires: parseInt(parts[4]) || -1,
      name: parts[5],
      value: parts[6],
      sameSite: 'Lax',
    };
  }).filter(Boolean);
}

// ─── Validation ──────────────────────────────────────────────────────────────

async function validateCookiesFile() {
  const spinner = ora({ text: 'Checking cookies.json...', indent: 2 }).start();

  if (!await fs.pathExists(COOKIES_PATH)) {
    spinner.fail('cookies.json not found');
    return false;
  }

  let raw;
  try {
    raw = await fs.readFile(COOKIES_PATH, 'utf-8');
  } catch (err) {
    spinner.fail(`Cannot read cookies.json: ${err.message}`);
    return false;
  }

  let cookies;
  try {
    cookies = JSON.parse(raw);
  } catch (err) {
    spinner.fail(`Invalid JSON: ${err.message}`);
    return false;
  }

  if (!Array.isArray(cookies)) {
    spinner.fail('cookies.json must be a JSON array');
    return false;
  }

  if (cookies.length === 0) {
    spinner.fail('cookies.json is an empty array');
    return false;
  }

  spinner.succeed(`Parsed ${cookies.length} cookies`);

  // Detect format
  const format = detectFormat(cookies);
  console.log(`  Format detected: ${chalk.cyan(format)}`);

  // Check for auto-conversion
  if (format === 'cookie-editor') {
    const convertSpinner = ora({ text: 'Converting Cookie-Editor format to Playwright format...', indent: 2 }).start();
    const converted = convertToPlaywright(cookies, format);
    await fs.writeJson(COOKIES_PATH, converted, { spaces: 2 });
    convertSpinner.succeed('Auto-converted to Playwright format (expirationDate -> expires)');
  }

  // Filter skool.com cookies
  const skoolCookies = cookies.filter(c =>
    c.domain && c.domain.includes('skool.com')
  );
  if (skoolCookies.length === 0) {
    console.log(chalk.red('  No skool.com cookies found in the file.'));
    console.log(chalk.yellow('  Make sure you export cookies while logged into skool.com.'));
    return false;
  }
  console.log(`  Skool cookies: ${chalk.green(skoolCookies.length)}`);

  // Check expiration
  const now = Date.now() / 1000;
  const expired = skoolCookies.filter(c => {
    const exp = c.expires || c.expirationDate;
    return exp && exp > 0 && exp < now;
  });
  const session = skoolCookies.filter(c => {
    const exp = c.expires || c.expirationDate;
    return !exp || exp <= 0;
  });
  const valid = skoolCookies.length - expired.length;

  if (expired.length > 0) {
    console.log(chalk.yellow(`  Expired: ${expired.length} cookies`));
  }
  if (session.length > 0) {
    console.log(chalk.dim(`  Session cookies: ${session.length} (no expiry)`));
  }
  console.log(`  Valid: ${chalk.green(valid)} cookies`);

  // Check required cookie fields
  const missingFields = [];
  for (const c of skoolCookies) {
    if (!c.name) missingFields.push('name');
    if (!c.value) missingFields.push('value');
    if (!c.domain) missingFields.push('domain');
  }
  if (missingFields.length > 0) {
    console.log(chalk.yellow(`  Warning: Some cookies are missing fields: ${[...new Set(missingFields)].join(', ')}`));
  }

  // Check for important cookies
  const importantNames = ['session', 'sSession', '__Secure-next-auth.session-token'];
  const found = importantNames.filter(name =>
    skoolCookies.some(c => c.name === name)
  );
  const missing = importantNames.filter(name =>
    !skoolCookies.some(c => c.name === name)
  );

  if (found.length > 0) {
    console.log(chalk.green(`  Key cookies present: ${found.join(', ')}`));
  }
  if (missing.length > 0) {
    console.log(chalk.dim(`  Optional cookies missing: ${missing.join(', ')}`));
  }

  return true;
}

async function validateWithPlaywright() {
  console.log('');
  const spinner = ora({ text: 'Testing cookies against skool.com with Playwright...', indent: 2 }).start();

  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    // Load cookies
    const cookies = await fs.readJson(COOKIES_PATH);
    const playwrightCookies = detectFormat(cookies) === 'playwright'
      ? cookies
      : convertToPlaywright(cookies, detectFormat(cookies));

    await context.addCookies(playwrightCookies);

    const page = await context.newPage();
    await page.goto('https://www.skool.com/settings', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    const url = page.url();
    const isLoggedIn = !url.includes('/login') && !url.includes('/signup');

    await browser.close();

    if (isLoggedIn) {
      spinner.succeed('Cookies are valid - successfully authenticated with Skool');
      return true;
    } else {
      spinner.fail('Cookies are expired or invalid - redirected to login page');
      console.log(chalk.yellow('  Please re-export your cookies after logging into Skool.'));
      return false;
    }
  } catch (err) {
    spinner.fail(`Playwright validation failed: ${err.message}`);
    return false;
  }
}

// ─── Convert Command ─────────────────────────────────────────────────────────

async function convertFile(inputPath) {
  const spinner = ora({ text: `Reading ${inputPath}...`, indent: 2 }).start();

  if (!await fs.pathExists(inputPath)) {
    spinner.fail(`File not found: ${inputPath}`);
    return;
  }

  const raw = await fs.readFile(inputPath, 'utf-8');
  let cookies;

  // Try JSON first
  try {
    cookies = JSON.parse(raw);
    if (Array.isArray(cookies)) {
      const format = detectFormat(cookies);
      spinner.succeed(`Detected JSON format: ${format}`);
      const converted = convertToPlaywright(cookies, format);
      await fs.writeJson(COOKIES_PATH, converted, { spaces: 2 });
      console.log(chalk.green(`  Saved ${converted.length} cookies to cookies.json`));
      return;
    }
  } catch {
    // Not JSON, try Netscape
  }

  // Try Netscape format
  if (raw.includes('\t')) {
    spinner.text = 'Detected Netscape cookie format...';
    cookies = parseNetscapeCookies(raw);
    if (cookies.length > 0) {
      spinner.succeed(`Parsed ${cookies.length} Netscape-format cookies`);
      const converted = convertToPlaywright(cookies, 'netscape');
      await fs.writeJson(COOKIES_PATH, converted, { spaces: 2 });
      console.log(chalk.green(`  Saved ${converted.length} cookies to cookies.json`));
      return;
    }
  }

  spinner.fail('Could not parse cookie file. Supported formats: JSON array, Netscape text.');
}

// ─── Guide Display ───────────────────────────────────────────────────────────

function showGuide() {
  console.log(`
${chalk.bold.cyan('  ╔══════════════════════════════════════╗')}
${chalk.bold.cyan('  ║      Cookie Export Guide              ║')}
${chalk.bold.cyan('  ╚══════════════════════════════════════╝')}

  This scraper needs your Skool login cookies to access classroom content.
  Here is how to export them:

${chalk.bold.yellow('  Method 1: Cookie-Editor Extension (Recommended)')}
${chalk.dim('  ─────────────────────────────────────────────────')}

  ${chalk.white('1.')} Install "Cookie-Editor" browser extension:
     ${chalk.dim('Chrome:')} ${chalk.cyan('https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm')}
     ${chalk.dim('Firefox:')} ${chalk.cyan('https://addons.mozilla.org/en-US/firefox/addon/cookie-editor/')}

  ${chalk.white('2.')} Log in to ${chalk.bold('skool.com')} in your browser

  ${chalk.white('3.')} Click the Cookie-Editor icon in your toolbar

  ${chalk.white('4.')} Click ${chalk.bold('"Export"')} (the download icon) -> ${chalk.bold('"Export as JSON"')}

  ${chalk.white('5.')} Save the content as ${chalk.bold('cookies.json')} in this project folder:
     ${chalk.dim(COOKIES_PATH)}

${chalk.bold.yellow('  Method 2: Browser DevTools')}
${chalk.dim('  ─────────────────────────────────────────────────')}

  ${chalk.white('1.')} Log in to ${chalk.bold('skool.com')}

  ${chalk.white('2.')} Open DevTools (F12) -> Application tab -> Cookies -> skool.com

  ${chalk.white('3.')} Manually copy cookies into a JSON array in this format:

${chalk.dim('  [')}
${chalk.dim('    {')}
${chalk.dim('      "name": "session",')}
${chalk.dim('      "value": "your-session-value",')}
${chalk.dim('      "domain": ".skool.com",')}
${chalk.dim('      "path": "/",')}
${chalk.dim('      "secure": true,')}
${chalk.dim('      "httpOnly": true,')}
${chalk.dim('      "sameSite": "Lax",')}
${chalk.dim('      "expires": 1234567890')}
${chalk.dim('    }')}
${chalk.dim('  ]')}

${chalk.bold.yellow('  Format Conversion')}
${chalk.dim('  ─────────────────────────────────────────────────')}

  If you have cookies in another format, this tool can convert them:

  ${chalk.white('node tools/export-cookies-guide.js --convert cookies-export.json')}
  ${chalk.white('node tools/export-cookies-guide.js --convert cookies.txt')}

  Supported formats:
    ${chalk.dim('-')} Cookie-Editor JSON (expirationDate -> expires)
    ${chalk.dim('-')} EditThisCookie JSON
    ${chalk.dim('-')} Netscape/wget text format (cookies.txt)

${chalk.bold.yellow('  Validation')}
${chalk.dim('  ─────────────────────────────────────────────────')}

  Check your cookies without running the full scraper:

  ${chalk.white('node tools/export-cookies-guide.js')}              ${chalk.dim('# basic check')}
  ${chalk.white('node tools/export-cookies-guide.js --validate')}   ${chalk.dim('# test against skool.com')}
`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Handle --convert with a file path
  if (shouldConvert && inputFile) {
    const absPath = path.isAbsolute(inputFile)
      ? inputFile
      : path.join(process.cwd(), inputFile);
    await convertFile(absPath);
    return;
  }

  // Check if cookies.json exists
  const exists = await fs.pathExists(COOKIES_PATH);

  if (!exists) {
    showGuide();
    return;
  }

  // cookies.json exists - validate it
  console.log('');
  console.log(chalk.bold.cyan('  Cookie Status'));
  console.log(chalk.dim('  ' + '─'.repeat(50)));
  console.log('');

  const valid = await validateCookiesFile();

  if (valid && shouldValidate) {
    await validateWithPlaywright();
  } else if (!valid) {
    console.log('');
    console.log(chalk.yellow('  Re-export your cookies to fix the issues above.'));
    showGuide();
  }

  console.log('');
}

main().catch((err) => {
  console.error(chalk.red(`\n  Error: ${err.message}\n`));
  process.exit(1);
});

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('🧪 Starting TECHMED Resource Architecture Verification Tests...\n');

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

// 1. CANONICAL RESOURCE DESTINATION (/resources/)
console.log('--- Suite 1: Canonical Resource Destination (/resources/) ---');

const resourcesAstroPath = path.resolve('web/src/pages/resources.astro');
const resourcesAstroContent = fs.readFileSync(resourcesAstroPath, 'utf8');

test('resources.astro exists and includes ResourceFilters component', () => {
  assert(fs.existsSync(resourcesAstroPath), 'resources.astro must exist');
  assert(resourcesAstroContent.includes('import ResourceFilters from \'../components/ResourceFilters.astro\';') ||
         resourcesAstroContent.includes('import ResourceFilters from "../components/ResourceFilters.astro";'),
         'ResourceFilters must be imported');
  assert(resourcesAstroContent.includes('<ResourceFilters'), 'ResourceFilters component must be rendered');
});

test('resources.astro grid-items have required metadata attributes for bookshelf filtering', () => {
  assert(resourcesAstroContent.includes('data-resource-id={resource.id}'), 'grid-item must have data-resource-id');
  assert(resourcesAstroContent.includes('data-slug={resource.slug}'), 'grid-item must have data-slug');
  assert(resourcesAstroContent.includes('data-subject='), 'grid-item must have data-subject');
  assert(resourcesAstroContent.includes('data-status={resource.status}'), 'grid-item must have data-status');
});

test('resources.astro includes bookshelfAuthPrompt and emptyBookshelfState containers', () => {
  assert(resourcesAstroContent.includes('id="bookshelfAuthPrompt"'), 'Must have #bookshelfAuthPrompt');
  assert(resourcesAstroContent.includes('id="emptyBookshelfState"'), 'Must have #emptyBookshelfState');
  assert(resourcesAstroContent.includes('/login?redirect=/resources?view=bookshelf'), 'Login prompt must redirect back to bookshelf');
});

test('resources.astro retains quizzes and Kairo sections', () => {
  assert(resourcesAstroContent.includes('quizResources'), 'Quiz resources must be preserved');
  assert(resourcesAstroContent.includes('kairo'), 'Kairo section must be preserved');
  assert(resourcesAstroContent.includes('QuizCard'), 'QuizCard component must be rendered');
});

test('resources.astro does not contain duplicate Open Student Library hero CTA or promotional banner', () => {
  assert(!resourcesAstroContent.includes('Open Student Library &rarr;'), 'Duplicate hero CTA must be removed');
  assert(!resourcesAstroContent.includes('student-library-banner'), 'Promotional library banner must be removed');
});

// 2. RETIRE /library/ LANDING PAGE & REDIRECTS
console.log('\n--- Suite 2: Retirement of /library/ Landing Page & Redirection ---');

const libraryIndexPath = path.resolve('web/src/pages/library/index.astro');
const astroConfigPath = path.resolve('web/astro.config.mjs');
const redirectsPath = path.resolve('web/public/_redirects');

test('astro.config.mjs has /library to /resources/ redirect configured', () => {
  const astroConfig = fs.readFileSync(astroConfigPath, 'utf8');
  assert(astroConfig.includes("'/library': '/resources/'") || astroConfig.includes("'/library': '/resources'"),
         'astro.config.mjs must redirect /library to /resources/');
});

test('public/_redirects has exactly ONE rule for /library pointing to /resources/', () => {
  assert(fs.existsSync(redirectsPath), 'public/_redirects must exist');
  const redirects = fs.readFileSync(redirectsPath, 'utf8');
  const lines = redirects.split('\n').map(l => l.trim()).filter(Boolean);
  const libRules = lines.filter(l => l.startsWith('/library ') || l.startsWith('/library\t'));
  assert.strictEqual(libRules.length, 1, `Expected exactly 1 rule for /library, found ${libRules.length}`);
  assert(libRules[0].includes('/resources/'), 'Rule for /library must point to /resources/');
  assert(libRules[0].includes('301'), 'Rule for /library must be 301 status');
});

test('public/_redirects has exactly ONE rule for /utme-2027/builders/join', () => {
  const redirects = fs.readFileSync(redirectsPath, 'utf8');
  const lines = redirects.split('\n').map(l => l.trim()).filter(Boolean);
  const joinRules = lines.filter(l => l.startsWith('/utme-2027/builders/join'));
  assert.strictEqual(joinRules.length, 1, `Expected exactly 1 rule for /utme-2027/builders/join, found ${joinRules.length}`);
  assert(joinRules[0].includes('/utme-2027/builders'), 'Rule must point to /utme-2027/builders');
  assert(joinRules[0].includes('301'), 'Rule must be 301 status');
});

test('public/_redirects contains no duplicate source rules', () => {
  const redirects = fs.readFileSync(redirectsPath, 'utf8');
  const lines = redirects.split('\n').map(l => l.trim()).filter(Boolean);
  const sources = lines.map(l => l.split(/\s+/)[0]);
  const uniqueSources = new Set(sources);
  assert.strictEqual(sources.length, uniqueSources.size, 'No duplicate source paths allowed in _redirects');
});

test('library/index.astro redirects immediately with 301 status', () => {
  const libraryIndex = fs.readFileSync(libraryIndexPath, 'utf8');
  assert(libraryIndex.includes("Astro.redirect('/resources', 301)") || libraryIndex.includes("Astro.redirect('/resources/', 301)"),
         'Must call Astro.redirect("/resources", 301)');
  assert(libraryIndex.includes('url=/resources'), 'HTML meta refresh fallback must redirect to /resources');
});

// 3. PRESERVE DEDICATED READER ROUTE (/library/read/[id])
console.log('\n--- Suite 3: Dedicated Reader Route Preservation ---');

const readerPath = path.resolve('web/src/pages/library/read/[id].astro');
test('web/src/pages/library/read/[id].astro exists and is fully intact', () => {
  assert(fs.existsSync(readerPath), 'Reader page /library/read/[id].astro must exist');
  const readerContent = fs.readFileSync(readerPath, 'utf8');
  assert(readerContent.includes('id="readerShell"'), 'Reader shell must exist');
  assert(readerContent.includes('id="pdfViewerContainer"') || readerContent.includes('pdfjs-dist'), 'PDF viewer or reader core must be present');
});

test('reader back-link returns cleanly to /resources?view=bookshelf', () => {
  const readerContent = fs.readFileSync(readerPath, 'utf8');
  assert(readerContent.includes('href="/resources?view=bookshelf"'), 'Reader topbar must link back to /resources?view=bookshelf');
  assert(!readerContent.includes('href="/library" class="back-link"'), 'Old /library back-link must not exist');
});

test('ResourceCard.astro and ResourceDetail.astro link directly to /library/read/${resource.id}', () => {
  const cardContent = fs.readFileSync(path.resolve('web/src/components/ResourceCard.astro'), 'utf8');
  assert(cardContent.includes('/library/read/${resource.id}'), 'ResourceCard must link to /library/read/${resource.id}');
});

// 4. SIMPLIFIED RESOURCE FILTERS COMPONENT
console.log('\n--- Suite 4: Simplified Resource Filters Component ---');

const filtersPath = path.resolve('web/src/components/ResourceFilters.astro');
const filtersContent = fs.readFileSync(filtersPath, 'utf8');

test('ResourceFilters contains only All Resources and My Bookshelf primary tabs', () => {
  assert(filtersContent.includes('id="tabAllResources"'), 'Must have #tabAllResources');
  assert(filtersContent.includes('id="tabMyBookshelf"'), 'Must have #tabMyBookshelf');
  assert(!filtersContent.includes('Free Only'), 'Old multi-status filter must be removed');
  assert(!filtersContent.includes('Included in Cohorts'), 'Old multi-status filter must be removed');
});

test('ResourceFilters imports and queries getUserResourceEntitlements and getCurrentUser', () => {
  assert(filtersContent.includes('getUserResourceEntitlements'), 'Must use getUserResourceEntitlements');
  assert(filtersContent.includes('getCurrentUser'), 'Must use getCurrentUser');
});

test('ResourceFilters uses Deep Navy (#012748) active button state and no gold gradients on tabs', () => {
  assert(filtersContent.includes('#012748'), 'Must use Deep Navy #012748');
  assert(!filtersContent.includes('linear-gradient(135deg, #c9a227'), 'Active tabs must not use gold gradients');
});

test('ResourceFilters synchronizes ?view=bookshelf query param', () => {
  assert(filtersContent.includes("url.searchParams.set('view', 'bookshelf')"), 'Must update URL to ?view=bookshelf');
  assert(filtersContent.includes("initialParams.get('view') === 'bookshelf'"), 'Must read initial ?view=bookshelf param');
});

// 5. NAVIGATION CLEANUP
console.log('\n--- Suite 5: Navigation Cleanup ---');

const routesPath = path.resolve('web/src/lib/routes.ts');
const routesContent = fs.readFileSync(routesPath, 'utf8');
const navbarPath = path.resolve('web/src/components/Navbar.astro');
const navbarContent = fs.readFileSync(navbarPath, 'utf8');

test('NAV_ROUTES includes Resources and excludes Library and Builder Cohort', () => {
  assert(routesContent.includes("path: '/resources'"), 'NAV_ROUTES must include /resources');
  assert(!routesContent.includes("path: '/library'"), 'NAV_ROUTES must NOT include /library');
  assert(!routesContent.includes("label: 'Builder Cohort'"), 'NAV_ROUTES must NOT include Builder Cohort');
});

test('Builder Cohort page still exists at /utme-2027/builders', () => {
  const buildersPage = path.resolve('web/src/pages/utme-2027/builders.astro');
  assert(fs.existsSync(buildersPage), 'Page /utme-2027/builders.astro must not be deleted');
});

test('Navbar desktop dropdown and mobile menu have no /library links', () => {
  assert(!navbarContent.includes('href="/library"'), 'Navbar must not contain href="/library"');
  assert(!navbarContent.includes('Bookshelf & Resources'), 'Duplicate Bookshelf & Resources link must be removed from dropdown');
});

// 6. CODEBASE-WIDE /library AUDIT
console.log('\n--- Suite 6: Codebase-wide /library Audit ---');

const filesToCheck = [
  'web/src/pages/dashboard.astro',
  'web/src/pages/payment/callback.astro',
  'web/src/pages/library/admin.astro',
  'web/src/lib/supabase.ts'
];

test('Dashboard, callback, admin, and supabase have no bare /library links', () => {
  for (const relPath of filesToCheck) {
    const content = fs.readFileSync(path.resolve(relPath), 'utf8');
    // Ensure no href="/library" or href: '/library'
    const hasBareLibrary = /href=["':]\s*['"]\/library['"]/i.test(content);
    assert(!hasBareLibrary, `${relPath} still contains bare /library reference`);
  }
});

// 7. BUILD OUTPUT REDIRECTS VALIDATION
console.log('\n--- Suite 7: Build Output _redirects Validation ---');

const distRedirectsPath = path.resolve('dist/_redirects');
const webDistRedirectsPath = path.resolve('web/dist/_redirects');

test('dist/_redirects exists and contains zero duplicate rules', () => {
  const targetPath = fs.existsSync(distRedirectsPath) ? distRedirectsPath : webDistRedirectsPath;
  assert(fs.existsSync(targetPath), `Build output _redirects must exist at ${targetPath}`);
  const content = fs.readFileSync(targetPath, 'utf8');
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const sources = lines.map(l => l.split(/\s+/)[0]);
  const uniqueSources = new Set(sources);
  assert.strictEqual(sources.length, uniqueSources.size, `No duplicate rules in build output: ${sources.join(', ')}`);
});

test('build output contains exactly ONE rule for /library pointing to /resources/', () => {
  const targetPath = fs.existsSync(distRedirectsPath) ? distRedirectsPath : webDistRedirectsPath;
  const content = fs.readFileSync(targetPath, 'utf8');
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const libRules = lines.filter(l => l.startsWith('/library ') || l.startsWith('/library\t'));
  assert.strictEqual(libRules.length, 1, `Expected exactly 1 rule for /library in build output, found ${libRules.length}`);
  assert(libRules[0].includes('/resources/'), 'Build output /library must point to /resources/');
});

test('build output contains exactly ONE rule for /utme-2027/builders/join pointing to /utme-2027/builders', () => {
  const targetPath = fs.existsSync(distRedirectsPath) ? distRedirectsPath : webDistRedirectsPath;
  const content = fs.readFileSync(targetPath, 'utf8');
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const joinRules = lines.filter(l => l.startsWith('/utme-2027/builders/join'));
  assert.strictEqual(joinRules.length, 1, `Expected exactly 1 rule for /utme-2027/builders/join in build output, found ${joinRules.length}`);
  assert(joinRules[0].includes('/utme-2027/builders'), 'Build output /utme-2027/builders/join must point to /utme-2027/builders');
});

test('build output preserves /library/read routes and does not wildcard-redirect /library/*', () => {
  const targetPath = fs.existsSync(distRedirectsPath) ? distRedirectsPath : webDistRedirectsPath;
  const content = fs.readFileSync(targetPath, 'utf8');
  assert(!content.includes('/library/*'), 'Must not have wildcard redirect for /library/*');
  assert(!content.includes('/library/read/*'), 'Must not have wildcard redirect for /library/read/*');
});

console.log(`\n==============================================`);
console.log(`Results: ${passedTests}/${totalTests} tests passed.`);
console.log(`==============================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}

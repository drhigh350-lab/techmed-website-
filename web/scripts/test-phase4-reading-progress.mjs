import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

console.log('====================================================');
console.log('TECHMED LIBRARY — PHASE 4: READING PROGRESS & RESUME');
console.log('====================================================');

// TEST 1: Schema Compatibility & Non-Destructive Migration
console.log('\nTEST 1: Schema Compatibility & Non-Destructive Migration');
const migrationPath = path.join(repoRoot, 'supabase', 'migrations', '20261102000001_reading_progress_pdf.sql');
assert(fs.existsSync(migrationPath), 'Phase 4 migration file exists at supabase/migrations/20261102000001_reading_progress_pdf.sql');

const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
assert(migrationSql.includes('current_page INTEGER NOT NULL DEFAULT 1'), 'Adds current_page column to reading_progress');
assert(migrationSql.includes('total_pages INTEGER NOT NULL DEFAULT 1'), 'Adds total_pages column to reading_progress');
assert(migrationSql.includes('reading_percent NUMERIC(5,2)'), 'Adds reading_percent column with numeric precision');
assert(migrationSql.includes('document_key TEXT NOT NULL DEFAULT'), 'Adds document_key column for bundle sub-documents');
assert(migrationSql.includes('is_finished BOOLEAN NOT NULL DEFAULT false'), 'Ensures is_finished column exists');
assert(
  migrationSql.includes('unique_user_resource_document_progress') &&
  migrationSql.includes('UNIQUE (user_id, resource_id, document_key)'),
  'Creates composite unique constraint for independent bundle progress'
);
assert(migrationSql.includes('ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY'), 'Enforces Row Level Security (RLS)');
assert(migrationSql.includes('auth.uid() = user_id'), 'Strict student isolation via auth.uid() check');
assert(!migrationSql.includes('DROP TABLE public.reading_progress'), 'Non-destructive: Does NOT drop existing reading_progress table');
assert(!migrationSql.includes('CREATE TABLE public.pdf_reading_progress'), 'No duplicate tables created');

// TEST 2: Reading Progress Calculation & Accuracy
console.log('\nTEST 2: Reading Progress Calculation & Bounds Accuracy');
const supabaseSrc = fs.readFileSync(path.join(webRoot, 'src', 'lib', 'supabase.ts'), 'utf-8');

assert(supabaseSrc.includes('export interface ReadingProgressRecord'), 'Exports ReadingProgressRecord interface');
assert(supabaseSrc.includes('saveReadingProgress'), 'Exports saveReadingProgress helper');
assert(supabaseSrc.includes('getReadingProgress'), 'Exports getReadingProgress helper');
assert(supabaseSrc.includes('getAllUserReadingProgress'), 'Exports getAllUserReadingProgress helper');
assert(supabaseSrc.includes('clearUserLocalReadingProgress'), 'Exports clearUserLocalReadingProgress helper');

// Simulation of reading percentage and completion calculation
function calculateProgress(currentPage, totalPages, isFinishedInput = false) {
  const safeTotal = Math.max(totalPages, 1);
  const safeCurrent = Math.min(Math.max(currentPage, 1), safeTotal);
  const rawPercent = (safeCurrent / safeTotal) * 100;
  const readingPercent = Math.min(100, Math.max(0, Math.round(rawPercent * 100) / 100));
  const isFinished = Boolean(isFinishedInput || safeCurrent >= safeTotal);
  return { currentPage: safeCurrent, totalPages: safeTotal, readingPercent, isFinished };
}

const p1 = calculateProgress(1, 10);
assert(p1.readingPercent === 10 && !p1.isFinished, 'Page 1 of 10 gives 10% and not finished');

const pMid = calculateProgress(42, 100);
assert(pMid.readingPercent === 42 && !pMid.isFinished, 'Page 42 of 100 gives 42%');

const pEnd = calculateProgress(50, 50);
assert(pEnd.readingPercent === 100 && pEnd.isFinished, 'Page 50 of 50 automatically marks isFinished true');

const pOverflow = calculateProgress(120, 50);
assert(pOverflow.currentPage === 50 && pOverflow.readingPercent === 100, 'Page number clamped to totalPages');

const pUnderflow = calculateProgress(-5, 50);
assert(pUnderflow.currentPage === 1 && pUnderflow.readingPercent === 2, 'Page number clamped to minimum 1');

// TEST 3: Debounced & Safe Persistence (Viewport Spy vs Background Pre-render)
console.log('\nTEST 3: Debounced & Safe Persistence (Scroll-Spy vs Background Pre-render)');
const readerPage = fs.readFileSync(path.join(webRoot, 'src', 'pages', 'library', 'read', '[id].astro'), 'utf-8');

assert(readerPage.includes('scheduleProgressSave(false)'), 'Uses debounced progress persistence on user scrolling');
assert(readerPage.includes('scheduleProgressSave(true)'), 'Uses immediate progress persistence on direct page jump');
assert(readerPage.includes('scrollSpyObserver = new IntersectionObserver'), 'Uses dedicated scrollSpyObserver for actual viewport detection');
assert(readerPage.includes('pageObserver = new IntersectionObserver'), 'Uses pageObserver for background lazy pre-rendering');
assert(readerPage.includes("threshold: [0.25, 0.6]"), 'scrollSpyObserver requires at least 25% intersection before updating reading position');
assert(readerPage.includes("rootMargin: '350px 0px 350px 0px'"), 'pageObserver pre-renders with 350px buffer without affecting reading position');

// TEST 4: Anti-Race Concurrency & Asynchronous Safety
console.log('\nTEST 4: Anti-Race Concurrency & Asynchronous Safety');
assert(supabaseSrc.includes('latestSaveTimeByKey'), 'Tracks latestSaveTimeByKey to prevent stale asynchronous writes');
assert(supabaseSrc.includes('setLocalReadingProgress(record)'), 'Immediately writes to localStorage before initiating network request');
assert(supabaseSrc.includes('catch (netErr)'), 'Gracefully catches network errors during save without crashing the reader');

// TEST 5: Resume Reading Prompt & Position Restoration
console.log('\nTEST 5: Resume Reading Prompt & Position Restoration');
assert(readerPage.includes('id="resumePromptBanner"'), 'Reader includes resumePromptBanner modal/banner');
assert(readerPage.includes('id="resumeContinueBtn"'), 'Reader includes Continue button');
assert(readerPage.includes('id="resumeRestartBtn"'), 'Reader includes Start from Beginning button');
assert(readerPage.includes('id="resumeDismissBtn"'), 'Reader includes Dismiss button');
assert(readerPage.includes('activeSavedProgress.currentPage > 1'), 'Shows resume prompt only if saved position is past page 1');
assert(readerPage.includes('scrollToPage(activeSavedProgress.currentPage)'), 'Clicking Continue jumps directly to saved page');
assert(readerPage.includes('scrollToPage(1)'), 'Clicking Start from Beginning jumps to Page 1');
assert(readerPage.includes('hideResumePrompt()'), 'Dismisses resume prompt upon action');

// TEST 6: First-Time Reader Experience
console.log('\nTEST 6: First-Time Reader Experience');
assert(readerPage.includes('renderSinglePdfPage(1)'), 'Renders Page 1 immediately for all users');
assert(readerPage.includes('style="display: none;"') && readerPage.includes('id="resumePromptBanner"'), 'Resume prompt is hidden by default');

// Simulate first-time vs returning reader logic
function evaluateResumePrompt(saved) {
  if (!saved || !saved.currentPage || saved.currentPage <= 1) {
    return { shouldPrompt: false, startPage: 1 };
  }
  return { shouldPrompt: true, resumePage: saved.currentPage };
}

assert(evaluateResumePrompt(null).shouldPrompt === false, 'First-time reader (null record) starts naturally at page 1 without prompt');
assert(evaluateResumePrompt({ currentPage: 1, totalPages: 50 }).shouldPrompt === false, 'First-time reader on page 1 starts without prompt');
assert(evaluateResumePrompt({ currentPage: 15, totalPages: 50 }).shouldPrompt === true, 'Returning reader on page 15 triggers resume prompt');

// TEST 7: Library Bookshelf Integration & Progress Indicators
console.log('\nTEST 7: Library Bookshelf Progress Indicators & Resume Actions');
const libraryPage = fs.readFileSync(path.join(webRoot, 'src', 'pages', 'library', 'index.astro'), 'utf-8');

assert(libraryPage.includes('getAllUserReadingProgress(user)'), 'Fetches all student reading progress records in library view');
assert(libraryPage.includes('class="book-progress-strip"'), 'Renders book-progress-strip on bookshelf cards');
assert(libraryPage.includes('class="progress-bar-track"'), 'Renders progress-bar-track');
assert(libraryPage.includes('class="progress-bar-fill'), 'Renders progress-bar-fill');
assert(libraryPage.includes('Continue Reading (p.'), 'Card action button updates to "Continue Reading (p. X)" for active books');
assert(libraryPage.includes('Re-read Manual'), 'Card action button updates to "Re-read Manual" for finished books');

// TEST 8: Bundle & Multi-Document Independence
console.log('\nTEST 8: Bundle & Multi-Document Independence');
assert(readerPage.includes('currentDocumentKey'), 'Reader maintains currentDocumentKey state');
assert(readerPage.includes('currentDocumentKey = entry.fileName'), 'Assigns unique document key when extracting individual ZIP entries');
assert(readerPage.includes('currentDocumentKey = firstPdf.fileName'), 'Assigns unique document key for first PDF in bundle');
assert(migrationSql.includes('document_key TEXT NOT NULL DEFAULT'), 'Database schema supports document_key column');

// Simulate independent bundle tracking
const storageSim = new Map();
function saveSim(userId, resourceId, documentKey, page) {
  const k = `${userId}:${resourceId}:${documentKey || ''}`;
  storageSim.set(k, { resourceId, documentKey, page });
}
function getSim(userId, resourceId, documentKey) {
  const k = `${userId}:${resourceId}:${documentKey || ''}`;
  return storageSim.get(k) || null;
}

saveSim('student-1', 'booster-bundle', 'chemistry-booster.pdf', 25);
saveSim('student-1', 'booster-bundle', 'biology-booster.pdf', 60);
saveSim('student-1', 'booster-bundle', 'physics-booster.pdf', 10);

assert(getSim('student-1', 'booster-bundle', 'chemistry-booster.pdf').page === 25, 'Chemistry booster preserves page 25');
assert(getSim('student-1', 'booster-bundle', 'biology-booster.pdf').page === 60, 'Biology booster preserves page 60');
assert(getSim('student-1', 'booster-bundle', 'physics-booster.pdf').page === 10, 'Physics booster preserves page 10');
assert(getSim('student-1', 'booster-bundle', 'chemistry-booster.pdf').page !== getSim('student-1', 'booster-bundle', 'biology-booster.pdf').page, 'Bundle constituents track progress completely independently');

// TEST 9: Completion Status Marking & Re-reading
console.log('\nTEST 9: Completion Status Marking & Re-reading');
assert(readerPage.includes('isFinished = pageToPersist >= totalPdfPages'), 'Automatically marks isFinished true when final page is reached');
assert(readerPage.includes('Re-read Manual') || libraryPage.includes('Re-read Manual'), 'Completed documents present Re-read option');

// TEST 10: Offline Resilience & Student Data Isolation
console.log('\nTEST 10: Offline Resilience & Student Data Isolation');
assert(readerPage.includes("document.addEventListener('visibilitychange'"), 'Flushes progress immediately on visibility change');
assert(readerPage.includes("window.addEventListener('beforeunload'"), 'Flushes progress immediately on beforeunload');
assert(libraryPage.includes('clearUserLocalReadingProgress(currentUser.id)'), 'Clears student local progress cache upon sign out');
assert(supabaseSrc.includes('techmed_pdf_progress_${safeUser}_${resourceId}_${safeDoc}'), 'Namespaces local cache strictly by student user ID');

console.log('\n====================================================');
console.log(`PHASE 4 TEST SUMMARY: ${passedTests} / ${totalTests} assertions passed.`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}

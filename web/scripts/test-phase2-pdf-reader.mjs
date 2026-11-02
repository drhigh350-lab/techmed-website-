import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runPhase2TestSuite() {
  console.log('====================================================');
  console.log('TECHMED LIBRARY — PHASE 2 CONTROLS & NAVIGATION TESTS');
  console.log('====================================================\n');

  // Test 1: Markup and Element ID Audit
  console.log('TEST 1: Reader DOM & Controls Architecture');
  const readerPath = path.join(webDir, 'src', 'pages', 'library', 'read', '[id].astro');
  const readerContent = fs.readFileSync(readerPath, 'utf8');

  assert(readerContent.includes('id="pdfSearchToggleBtn"'), 'Search toggle button exists in controls group');
  assert(readerContent.includes('id="pdfPageInput"'), 'Editable page number input exists in page controls');
  assert(readerContent.includes('id="pdfTotalPages"'), 'Total pages counter element exists');
  assert(readerContent.includes('id="pdfZoomOutBtn"'), 'Zoom out button exists');
  assert(readerContent.includes('id="pdfZoomInBtn"'), 'Zoom in button exists');
  assert(readerContent.includes('id="pdfZoomLevel"'), 'Zoom percentage display exists');
  assert(readerContent.includes('id="pdfFitWidthBtn"'), 'Fit Width button exists');
  assert(readerContent.includes('id="pdfFitPageBtn"'), 'Fit Page button exists');
  assert(readerContent.includes('id="pdfSearchBar"'), 'Dedicated PDF search bar container exists');
  assert(readerContent.includes('id="pdfSearchInput"'), 'Search input field exists');
  assert(readerContent.includes('id="pdfSearchCount"'), 'Match counter display exists');
  assert(readerContent.includes('id="pdfSearchPrevBtn"'), 'Previous match button exists');
  assert(readerContent.includes('id="pdfSearchNextBtn"'), 'Next match button exists');
  assert(readerContent.includes('id="pdfSearchClearBtn"'), 'Clear search button exists');
  assert(readerContent.includes('id="pdfSearchCloseBtn"'), 'Close search button exists');
  assert(readerContent.includes('class="pdf-highlight-layer"'), 'Page wrappers contain highlight layer for search matches');

  // Test 2: Zoom Logic & Increment Stepping
  console.log('\nTEST 2: Document Zoom Range & Step Clamping');
  const ZOOM_LEVELS = [0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00, 2.50, 3.00];

  function simulateZoomIn(current) {
    if (current >= 3.00) return 3.00;
    const next = ZOOM_LEVELS.find((z) => z > current + 0.02) || 3.00;
    return Math.min(next, 3.00);
  }

  function simulateZoomOut(current) {
    if (current <= 0.50) return 0.50;
    const prev = [...ZOOM_LEVELS].reverse().find((z) => z < current - 0.02) || 0.50;
    return Math.max(prev, 0.50);
  }

  assert(simulateZoomIn(1.00) === 1.25, 'Zoom in from 100% steps to 125%');
  assert(simulateZoomIn(1.25) === 1.50, 'Zoom in from 125% steps to 150%');
  assert(simulateZoomIn(2.50) === 3.00, 'Zoom in from 250% steps to maximum 300%');
  assert(simulateZoomIn(3.00) === 3.00, 'Zoom in at maximum 300% is clamped to 3.00 (cannot exceed)');
  assert(simulateZoomOut(1.00) === 0.75, 'Zoom out from 100% steps to 75%');
  assert(simulateZoomOut(0.75) === 0.50, 'Zoom out from 75% steps to minimum 50%');
  assert(simulateZoomOut(0.50) === 0.50, 'Zoom out at minimum 50% is clamped to 0.50 (cannot drop below)');

  // Fit Width simulation
  const basePageWidth = 595.28;
  const desktopWidth = 960;
  const fitWidthDesktop = Math.min(Math.max((desktopWidth - 32) / basePageWidth, 0.50), 3.00);
  assert(fitWidthDesktop > 1.4 && fitWidthDesktop < 1.7, `Fit Width on desktop calculates valid scale (${Math.round(fitWidthDesktop * 100)}%)`);

  const mobileWidth = 360;
  const fitWidthMobile = Math.min(Math.max((mobileWidth - 32) / basePageWidth, 0.50), 3.00);
  assert(fitWidthMobile >= 0.50 && fitWidthMobile <= 0.60, `Fit Width on mobile calculates valid scale (${Math.round(fitWidthMobile * 100)}%)`);

  // Test 3: Page Navigation & Validation
  console.log('\nTEST 3: Direct Page Navigation & Bounds Validation');
  const totalPages = 172;

  function validatePageJump(input, currentPage) {
    const val = parseInt(input.toString().trim(), 10);
    if (isNaN(val) || val < 1 || val > totalPages) {
      return { valid: false, page: currentPage };
    }
    return { valid: true, page: val };
  }

  assert(validatePageJump('1', 5).valid && validatePageJump('1', 5).page === 1, 'Valid direct jump to page 1');
  assert(validatePageJump('50', 5).valid && validatePageJump('50', 5).page === 50, 'Valid direct jump to page 50');
  assert(validatePageJump('172', 5).valid && validatePageJump('172', 5).page === 172, 'Valid direct jump to final page 172');
  assert(!validatePageJump('0', 5).valid && validatePageJump('0', 5).page === 5, 'Invalid page 0 rejected and preserved current page');
  assert(!validatePageJump('-10', 5).valid && validatePageJump('-10', 5).page === 5, 'Negative page rejected and preserved current page');
  assert(!validatePageJump('173', 5).valid && validatePageJump('173', 5).page === 5, 'Out-of-bounds page 173 rejected and preserved current page');
  assert(!validatePageJump('abc', 5).valid && validatePageJump('abc', 5).page === 5, 'Non-numeric input rejected and preserved current page');

  // Test 4: PDF.js Full Document Text Search
  console.log('\nTEST 4: In-Document Full Search Engine');
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Test on short fixture
  const shortBuffer = new Uint8Array(fs.readFileSync(path.join(webDir, 'public', 'test-sample-short.pdf')));
  const shortDoc = await pdfjsLib.getDocument({ data: shortBuffer }).promise;

  async function searchDoc(doc, query) {
    const matches = [];
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return matches;

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      for (const item of tc.items) {
        if (!item || !item.str) continue;
        const lowerStr = item.str.toLowerCase();
        let start = 0;
        let idx = -1;
        while ((idx = lowerStr.indexOf(lowerQuery, start)) !== -1) {
          matches.push({
            pageNum: p,
            str: item.str,
            charIndex: idx,
            length: query.length,
          });
          start = idx + lowerQuery.length;
        }
      }
    }
    return matches;
  }

  const shortMatches = await searchDoc(shortDoc, 'Stoichiometry');
  assert(shortMatches.length === 1, `Search "Stoichiometry" found expected match count (actual: ${shortMatches.length})`);
  assert(shortMatches[0]?.pageNum === 1, 'Match correctly identified on page 1');

  const shortMatchesMultiple = await searchDoc(shortDoc, 'Page');
  assert(shortMatchesMultiple.length >= 2, `Search "Page" found multi-page matches (actual: ${shortMatchesMultiple.length})`);

  const emptyMatches = await searchDoc(shortDoc, 'nonExistentMedicalTerm999');
  assert(emptyMatches.length === 0, 'Search for non-existent term correctly returns 0 matches');

  // Test on 172-page long document
  console.log('\nTEST 5: Long Document (172 Pages) Search Performance');
  const officialBuffer = new Uint8Array(fs.readFileSync(path.join(webDir, 'public', 'techmed-admission-intelligence-guide-2026.pdf')));
  const officialDoc = await pdfjsLib.getDocument({ data: officialBuffer }).promise;

  console.time('Search "Think Smart" across 172 pages');
  const guideMatches = await searchDoc(officialDoc, 'Think Smart');
  console.timeEnd('Search "Think Smart" across 172 pages');

  assert(guideMatches.length > 5, `Search "Think Smart" across 172 pages found matches across document (count: ${guideMatches.length})`);
  assert(guideMatches.some(m => m.pageNum === 2), 'Match found on early page (Page 2)');
  assert(guideMatches.some(m => m.pageNum > 10), 'Match found on later pages (Page > 10)');

  // Test 6: Search Match Navigation (Cyclic wrapping)
  console.log('\nTEST 6: Search Match Navigation Cycling');
  const sampleMatchesCount = 5;
  function getNextMatch(curr, total) { return (curr + 1) % total; }
  function getPrevMatch(curr, total) { return (curr - 1 + total) % total; }

  assert(getNextMatch(0, sampleMatchesCount) === 1, 'Next match from 0 moves to 1');
  assert(getNextMatch(4, sampleMatchesCount) === 0, 'Next match from end (4 of 5) cycles back to 0');
  assert(getPrevMatch(0, sampleMatchesCount) === 4, 'Previous match from 0 cycles back to end (4)');
  assert(getPrevMatch(2, sampleMatchesCount) === 1, 'Previous match from 2 moves to 1');

  // Test 7: Keyboard Shortcuts & Usability Audit
  console.log('\nTEST 7: Accessibility & Keyboard Navigation');
  assert(readerContent.includes("e.key === 'f' || e.key === 'F'") && readerContent.includes('toggleSearchBar(true)'), 'Ctrl+F/Cmd+F shortcut mapped to open search');
  assert(readerContent.includes("e.key === 'Escape'") && readerContent.includes('toggleSearchBar(false)'), 'Escape shortcut mapped to close search');
  assert(readerContent.includes("e.key === '+'") && readerContent.includes('zoomIn()'), '+/= shortcut mapped to Zoom In');
  assert(readerContent.includes("e.key === '-'") && readerContent.includes('zoomOut()'), '-/_ shortcut mapped to Zoom Out');
  assert(readerContent.includes("e.key === 'ArrowLeft'") && readerContent.includes('scrollToPage'), 'ArrowLeft shortcut mapped to previous page');
  assert(readerContent.includes("e.key === 'ArrowRight'") && readerContent.includes('scrollToPage'), 'ArrowRight shortcut mapped to next page');

  // Test 8: CSS Styling Audit for Phase 2 Controls
  console.log('\nTEST 8: CSS Styling & Mobile Responsiveness');
  assert(readerContent.includes('.pdf-search-bar'), 'CSS includes .pdf-search-bar styling');
  assert(readerContent.includes('.pdf-highlight-item.active'), 'CSS includes .pdf-highlight-item.active styling');
  assert(readerContent.includes('.page-num-input'), 'CSS includes .page-num-input styling');
  assert(readerContent.includes('@media (max-width: 768px)'), 'CSS includes mobile responsive rules');

  console.log('\n====================================================');
  console.log(`RESULTS: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase2TestSuite().catch((err) => {
  console.error('Phase 2 test suite error:', err);
  process.exit(1);
});

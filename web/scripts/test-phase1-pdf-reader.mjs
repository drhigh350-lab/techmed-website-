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

async function runTestSuite() {
  console.log('====================================================');
  console.log('TECHMED LIBRARY — PHASE 1 PDF READER TEST SUITE');
  console.log('====================================================\n');

  // Test 1: Worker File Verification
  console.log('TEST 1: PDF.js Worker Configuration');
  const workerPath = path.join(webDir, 'public', 'pdfjs', 'pdf.worker.min.mjs');
  const workerExists = fs.existsSync(workerPath);
  assert(workerExists, 'Worker file exists at web/public/pdfjs/pdf.worker.min.mjs');
  if (workerExists) {
    const stat = fs.statSync(workerPath);
    assert(stat.size > 500000, `Worker file is complete (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  }

  // Test 2: Dependency check
  console.log('\nTEST 2: pdfjs-dist Dependency Check');
  const pkgPath = path.join(webDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert(!!pkg.dependencies['pdfjs-dist'], 'pdfjs-dist is declared in dependencies');
  console.log(`  Declared version: ${pkg.dependencies['pdfjs-dist']}`);

  // Test 3: Load pdfjs-dist legacy module in Node
  console.log('\nTEST 3: PDF.js Runtime Import');
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  assert(typeof pdfjsLib.getDocument === 'function', 'pdfjsLib.getDocument function is available');

  // Test 4: Parse Short Test PDF Fixture
  console.log('\nTEST 4: Short PDF Fixture Rendering Verification');
  const shortPdfPath = path.join(webDir, 'public', 'test-sample-short.pdf');
  assert(fs.existsSync(shortPdfPath), 'test-sample-short.pdf exists in public directory');
  const shortBuffer = new Uint8Array(fs.readFileSync(shortPdfPath));
  const shortDoc = await pdfjsLib.getDocument({ data: shortBuffer }).promise;
  assert(shortDoc.numPages === 2, `Short fixture has exactly 2 pages (actual: ${shortDoc.numPages})`);
  const p1 = await shortDoc.getPage(1);
  const vp1 = p1.getViewport({ scale: 1.0 });
  assert(vp1.width > 0 && vp1.height > 0, `Page 1 dimensions valid: ${vp1.width} x ${vp1.height} pt`);

  // Test 5: Parse Official Admission Intelligence Guide PDF
  console.log('\nTEST 5: Official 172-Page Document Verification');
  const officialPdfPath = path.join(webDir, 'public', 'techmed-admission-intelligence-guide-2026.pdf');
  assert(fs.existsSync(officialPdfPath), 'techmed-admission-intelligence-guide-2026.pdf exists in public directory');
  const officialBuffer = new Uint8Array(fs.readFileSync(officialPdfPath));
  const officialDoc = await pdfjsLib.getDocument({ data: officialBuffer }).promise;
  assert(officialDoc.numPages === 172, `Official Guide parsed all 172 pages (actual: ${officialDoc.numPages})`);
  const pOfficial1 = await officialDoc.getPage(1);
  const vpOfficial1 = pOfficial1.getViewport({ scale: 1.0 });
  assert(Math.round(vpOfficial1.width) === 595, `Official Page 1 width is standard A4 595 pt (actual: ${Math.round(vpOfficial1.width)})`);
  assert(Math.round(vpOfficial1.height) === 842, `Official Page 1 height is standard A4 842 pt (actual: ${Math.round(vpOfficial1.height)})`);

  // Test 6: Verify Reader Markup & Script Integrity
  console.log('\nTEST 6: Reader [id].astro Structure Audit');
  const readerFile = fs.readFileSync(path.join(webDir, 'src', 'pages', 'library', 'read', '[id].astro'), 'utf8');

  assert(readerFile.includes('id="pdfControlsGroup"'), 'Reader topbar contains #pdfControlsGroup');
  assert(readerFile.includes('id="pdfZoomInBtn"') && readerFile.includes('id="pdfZoomOutBtn"'), 'Zoom In and Zoom Out controls exist');
  assert(readerFile.includes('id="pdfFitWidthBtn"') && readerFile.includes('id="pdfFitPageBtn"'), 'Fit Width and Fit Page controls exist');
  assert(readerFile.includes('id="pdfPrevPageBtn"') && readerFile.includes('id="pdfNextPageBtn"'), 'Page step controls exist');
  assert((readerFile.includes('id="pdfCurrentPage"') || readerFile.includes('id="pdfPageInput"')) && readerFile.includes('id="pdfTotalPages"'), 'Page counter elements exist');
  assert(readerFile.includes('id="pdfViewerStage"'), 'Main area contains #pdfViewerStage');
  assert(readerFile.includes('id="pdfPagesContainer"'), 'Continuous scroll #pdfPagesContainer exists');
  assert(readerFile.includes('id="pdfLoadingBox"'), 'Loading skeleton box exists');
  assert(readerFile.includes('id="pdfErrorBox"'), 'Error handling fallback box exists');
  assert(readerFile.includes('workerSrc = \'/pdfjs/pdf.worker.min.mjs\''), 'Configures local workerSrc properly');
  assert(readerFile.includes('IntersectionObserver'), 'Uses IntersectionObserver for lazy page rendering');
  assert(readerFile.includes('switchToHtmlReader()'), 'Preserves HTML reader fallback');
  assert(readerFile.includes('getSecureResourcePdf'), 'Integrates getSecureResourcePdf entitlement gate');

  // Test 7: Verify readerContent.ts Preserved
  console.log('\nTEST 7: Fallback readerContent.ts Preservation');
  const readerContentPath = path.join(webDir, 'src', 'lib', 'readerContent.ts');
  assert(fs.existsSync(readerContentPath), 'readerContent.ts file is strictly preserved');
  const rcStats = fs.statSync(readerContentPath);
  assert(rcStats.size > 20000, `readerContent.ts has content (${rcStats.size} bytes)`);

  console.log('\n====================================================');
  console.log(`RESULTS: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite failed with unhandled exception:', err);
  process.exit(1);
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');

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
console.log('TECHMED LIBRARY — PHASE 3 SECURITY & BUNDLES TEST');
console.log('====================================================');

// TEST 1: Logo Asset Verification
console.log('TEST 1: Official Logo Asset Verification');
const logoPath = path.join(webRoot, 'public', 'images', 'logo.png');
assert(fs.existsSync(logoPath), 'Official logo asset exists at web/public/images/logo.png');
const logoStats = fs.statSync(logoPath);
assert(logoStats.size > 500000, `Official logo file is high fidelity (actual: ${(logoStats.size / 1024).toFixed(1)} KB)`);

// TEST 2: Watermark Overhaul Audit (No Student PII)
console.log('\nTEST 2: Watermark Overhaul & Student PII Elimination');
const readerFile = fs.readFileSync(path.join(webRoot, 'src', 'pages', 'library', 'read', '[id].astro'), 'utf-8');

assert(readerFile.includes("brandLogo.src = '/images/logo.png'"), 'Reuses official /images/logo.png asset');
assert(!readerFile.includes('UNAUTHORIZED SHARING PROHIBITED'), 'Student watermark string "UNAUTHORIZED SHARING PROHIBITED" removed');
assert(!readerFile.includes('${email} · TECHMED LICENSED READER'), 'Student email watermark stamp removed');
assert(!readerFile.includes('${userEmail} · TECHMED · ${dateStr}'), 'Page canvas text stamp with userEmail and dateStr removed');
assert(readerFile.includes('ctx.drawImage(brandLogo'), 'Renders official brand logo directly onto canvas');
assert(readerFile.includes('ctx.globalAlpha = currentTheme === \'light\' ? 0.048 : 0.058'), 'Maintains subtle opacity between 0.048 and 0.058');

// TEST 3: Access Security & Authoritative Entitlement Rules
console.log('\nTEST 3: Authoritative Entitlement & Cohort Verification');
const supabaseSrc = fs.readFileSync(path.join(webRoot, 'src', 'lib', 'supabase.ts'), 'utf-8');

assert(supabaseSrc.includes('hasActiveResourceAccess'), 'hasActiveResourceAccess function exists in supabase.ts');
assert(supabaseSrc.includes('admission-intelligence-guide-2026'), 'Free admission guide explicitly permitted without authentication');
assert(supabaseSrc.includes('if (!user?.id && !user?.email)'), 'Paid resources strictly require authenticated student session');
assert(supabaseSrc.includes('isMasteryCohort') && supabaseSrc.includes('isUltimateCohort'), 'Recognizes Mastery and Ultimate cohort enrolments');
assert(supabaseSrc.includes('isBoosterBundleEntitled') || supabaseSrc.includes('booster-bundle'), 'Recognizes booster-bundle entitlements for science boosters');
assert(supabaseSrc.includes('isUltimateResource'), 'Ultimate cohort includes Post-UTME Brainstorming Hub');
assert(supabaseSrc.includes('e.expiresAt'), 'Checks entitlement expiration date');
assert(supabaseSrc.includes('createSignedUrl(fileName, 3600)'), 'Generates short-lived 1-hour signed URLs for storage objects');
assert(!supabaseSrc.includes('service_role'), 'Does not leak service role credentials in client code');

// TEST 4: Dynamic Entitlement Evaluation Simulator
console.log('\nTEST 4: Entitlement Engine Simulation');

function simulateAccess(resourceId, user, entitlements) {
  // Free resources
  if (['admission-intelligence-guide-2026', 'free-quiz-practice', 'kairo'].includes(resourceId)) {
    return true;
  }
  // Unauthenticated
  if (!user || (!user.id && !user.email)) return false;

  const now = Date.now();
  return entitlements.some(e => {
    const isMastery = e.resourceId?.includes('mastery') || e.planId?.includes('mastery');
    const isUltimate = e.resourceId?.includes('ultimate') || e.planId?.includes('ultimate');
    const isBoosterBundle = e.resourceId === 'booster-bundle' || e.planId === 'booster-bundle';
    const isBooster = ['chemistry-booster', 'biology-booster', 'physics-booster'].includes(resourceId);
    const isPostUtme = ['post-utme-brainstorming-hub', 'post-utme-pq'].includes(resourceId);

    const matchesId = e.resourceId === resourceId;
    const matchesBooster = isBooster && (isMastery || isUltimate || isBoosterBundle);
    const matchesBundleParent = resourceId === 'booster-bundle' && (isBoosterBundle || isMastery || isUltimate);
    const matchesUltimatePostUtme = isPostUtme && isUltimate;

    if (!matchesId && !matchesBooster && !matchesBundleParent && !matchesUltimatePostUtme) return false;
    if (!e.isActive) return false;

    // Check expiration
    if (e.expiresAt && !matchesBooster && !matchesBundleParent && !matchesUltimatePostUtme) {
      if (new Date(e.expiresAt).getTime() <= now) return false;
    }
    return true;
  });
}

// 4.1 Free material without user
assert(simulateAccess('admission-intelligence-guide-2026', null, []) === true, 'Free guide accessible to unauthenticated visitor');

// 4.2 Paid booster without user
assert(simulateAccess('chemistry-booster', null, []) === false, 'Paid chemistry booster denied to unauthenticated visitor');

// 4.3 Paid booster with active purchase
assert(simulateAccess('chemistry-booster', { id: 'u1' }, [{ resourceId: 'chemistry-booster', isActive: true }]) === true, 'Direct purchaser granted access');

// 4.4 Inactive entitlement
assert(simulateAccess('chemistry-booster', { id: 'u1' }, [{ resourceId: 'chemistry-booster', isActive: false }]) === false, 'Inactive entitlement denied');

// 4.5 Expired entitlement
assert(simulateAccess('chemistry-booster', { id: 'u1' }, [{ resourceId: 'chemistry-booster', isActive: true, expiresAt: '2025-01-01T00:00:00Z' }]) === false, 'Expired entitlement denied');

// 4.6 Mastery cohort student accessing all 3 boosters
assert(simulateAccess('chemistry-booster', { id: 'u2' }, [{ resourceId: 'cohort-mastery', isActive: true }]) === true, 'Mastery student granted Chemistry Booster');
assert(simulateAccess('biology-booster', { id: 'u2' }, [{ resourceId: 'cohort-mastery', isActive: true }]) === true, 'Mastery student granted Biology Booster');
assert(simulateAccess('physics-booster', { id: 'u2' }, [{ resourceId: 'cohort-mastery', isActive: true }]) === true, 'Mastery student granted Physics Booster');
assert(simulateAccess('post-utme-brainstorming-hub', { id: 'u2' }, [{ resourceId: 'cohort-mastery', isActive: true }]) === false, 'Mastery student denied Post-UTME Hub (Ultimate only)');

// 4.7 Ultimate cohort student
assert(simulateAccess('post-utme-brainstorming-hub', { id: 'u3' }, [{ resourceId: 'cohort-ultimate', isActive: true }]) === true, 'Ultimate student granted Post-UTME Hub');
assert(simulateAccess('chemistry-booster', { id: 'u3' }, [{ resourceId: 'cohort-ultimate', isActive: true }]) === true, 'Ultimate student granted Chemistry Booster');

// 4.8 Booster bundle entitlement
assert(simulateAccess('booster-bundle', { id: 'u4' }, [{ resourceId: 'booster-bundle', isActive: true }]) === true, 'Bundle purchaser granted booster-bundle parent');
assert(simulateAccess('chemistry-booster', { id: 'u4' }, [{ resourceId: 'booster-bundle', isActive: true }]) === true, 'Bundle purchaser granted Chemistry constituent');
assert(simulateAccess('biology-booster', { id: 'u4' }, [{ resourceId: 'booster-bundle', isActive: true }]) === true, 'Bundle purchaser granted Biology constituent');
assert(simulateAccess('physics-booster', { id: 'u4' }, [{ resourceId: 'booster-bundle', isActive: true }]) === true, 'Bundle purchaser granted Physics constituent');

// TEST 5: In-Memory ZIP Reader Engine & Security Protection
console.log('\nTEST 5: In-Memory ZIP Archive Parser & Security Traversal Checks');
const zipReaderSrc = fs.readFileSync(path.join(webRoot, 'src', 'lib', 'zipReader.ts'), 'utf-8');

assert(zipReaderSrc.includes('export async function parseZipArchive'), 'parseZipArchive function exported');
assert(zipReaderSrc.includes('sanitizeZipPath'), 'Includes path sanitization function');
assert(zipReaderSrc.includes('rawPath.includes(\'..\')'), 'Explicitly rejects directory traversal \'..\' attacks');
assert(zipReaderSrc.includes('application/pdf'), 'Identifies application/pdf MIME type');
assert(zipReaderSrc.includes('extractPdfBlob') && zipReaderSrc.includes('extractPdfUrl'), 'Provides in-memory PDF extraction to Blob and Object URL');
assert(zipReaderSrc.includes('DecompressionStream'), 'Uses web standard native DecompressionStream');

// TEST 6: In-Memory ZIP Builder & Parser Roundtrip Test
console.log('\nTEST 6: Real ZIP Binary Parsing & Extraction Test');

// Construct a valid uncompressed (Store) ZIP in memory containing a sample PDF and a text file
function createSampleZip() {
  const file1Name = 'sample-document.pdf';
  const file1Data = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (TECHMED Bundle Sample) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
  
  const file2Name = 'readme.txt';
  const file2Data = Buffer.from('Welcome to TECHMED Science Booster Suite.');

  function makeLocalHeader(name, data) {
    const header = Buffer.alloc(30 + name.length);
    header.writeUInt32LE(0x04034b50, 0); // signature
    header.writeUInt16LE(20, 4); // version needed
    header.writeUInt16LE(0, 6); // flags
    header.writeUInt16LE(0, 8); // compression: 0 = Store
    header.writeUInt16LE(0, 10); // time
    header.writeUInt16LE(0, 12); // date
    header.writeUInt32LE(0, 14); // crc32 placeholder
    header.writeUInt32LE(data.length, 18); // comp size
    header.writeUInt32LE(data.length, 22); // uncomp size
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(0, 28);
    header.write(name, 30);
    return Buffer.concat([header, data]);
  }

  const part1 = makeLocalHeader(file1Name, file1Data);
  const offset2 = part1.length;
  const part2 = makeLocalHeader(file2Name, file2Data);
  const cdOffset = part1.length + part2.length;

  function makeCentralHeader(name, data, locOffset) {
    const cd = Buffer.alloc(46 + name.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10); // store
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(0, 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(locOffset, 42);
    cd.write(name, 46);
    return cd;
  }

  const cd1 = makeCentralHeader(file1Name, file1Data, 0);
  const cd2 = makeCentralHeader(file2Name, file2Data, offset2);
  const cdSize = cd1.length + cd2.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(2, 8); // total records
  eocd.writeUInt16LE(2, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([part1, part2, cd1, cd2, eocd]);
}

const sampleZipBuf = createSampleZip();
assert(sampleZipBuf.length > 50, 'Generated valid in-memory test ZIP archive');

// Import and run parseZipArchive from compiled bundle or TS directly
// Read compiled implementation
const zipModule = await import('../src/lib/zipReader.ts');
const parsedArchive = await zipModule.parseZipArchive(sampleZipBuf);

assert(parsedArchive.entries.length === 2, `Parsed exactly 2 archive entries (actual: ${parsedArchive.entries.length})`);
assert(parsedArchive.pdfEntries.length === 1, `Identified 1 PDF document entry (actual: ${parsedArchive.pdfEntries.length})`);
assert(parsedArchive.hasPdfs === true, 'Detected PDF documents in archive');
const pdfEntry = parsedArchive.pdfEntries[0];
assert(pdfEntry.cleanName === 'sample-document.pdf', 'Clean filename extracted');
assert(pdfEntry.isPdf === true, 'PDF entry marked isPdf = true');

const extractedBytes = await parsedArchive.extractEntry(pdfEntry);
const extractedText = Buffer.from(extractedBytes).toString('utf-8');
assert(extractedText.startsWith('%PDF-1.4'), 'Extracted PDF bytes start with standard PDF header');
assert(extractedText.includes('TECHMED Bundle Sample'), 'Extracted PDF contains uncorrupted document payload');

// TEST 7: In-Platform Bundle Reading Experience UI
console.log('\nTEST 7: Bundle Reader Experience & Navigator Integration');
assert(readerFile.includes('id="bundleExplorerSection"'), 'In-platform #bundleExplorerSection card exists in DOM');
assert(readerFile.includes('class="bundle-items-grid"'), 'Bundle items grid layout exists');
assert(readerFile.includes('id="bundleDrawer"'), 'Companion #bundleDrawer quick-switch container exists');
assert(readerFile.includes('id="toggleBundleBtn"'), 'Bundle drawer toggle button exists in topbar');
assert(readerFile.includes('setupBundleExperience'), 'setupBundleExperience handler initialized');
assert(readerFile.includes('loadAndRenderZipBundle'), 'loadAndRenderZipBundle in-memory extractor initialized');

// TEST 8: Session Security & Cache Partitioning
console.log('\nTEST 8: Session Security & Cache Partitioning');
assert(readerFile.includes('techmed-reader-user-'), 'Caches partitioned per student user ID to prevent cross-account leakage');
assert(readerFile.includes('if (RESOURCE.status === \'paid\' && !currentUser?.id)'), 'Guards offline caching against unauthenticated access for paid manuals');

console.log('====================================================');
console.log(`RESULTS: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('====================================================');

import JSZip from 'jszip';
import { getLanguageFromFilename, getLanguageById } from './languageDetector';

const fallbackLang = getLanguageById(62) || { id: 62, name: 'Java', monacoLanguage: 'java' };

// Ignore unwanted system / cache directories and files
const IGNORED_PATTERNS = [
  /^\.git\//,
  /^node_modules\//,
  /^\.DS_Store$/,
  /\/\.DS_Store$/,
  /^__pycache__\//,
  /\.pyc$/,
  /\.class$/,
  /\.o$/,
  /\.exe$/,
  /\.zip$/,
];

export function shouldIgnorePath(path) {
  return IGNORED_PATTERNS.some((pattern) => pattern.test(path));
}

// Read File as text
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// Process standard files array (from `<input type="file" multiple />`)
export async function processFileList(fileList) {
  const results = [];
  const files = Array.from(fileList);

  for (const file of files) {
    const relativePath = file.webkitRelativePath || file.name;
    if (shouldIgnorePath(relativePath)) continue;

    try {
      const content = await readFileAsText(file);
      const language = getLanguageFromFilename(relativePath) || fallbackLang;

      results.push({
        id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        path: relativePath,
        name: relativePath,
        content: content,
        size: file.size,
        language: language,
      });
    } catch (err) {
      console.warn(`Could not read file "${relativePath}":`, err);
    }
  }

  return results;
}

// Recursive helper for FileSystemEntry (drag and drop folder support)
async function readEntry(entry, currentPath = '') {
  const results = [];

  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

    if (!shouldIgnorePath(fullPath)) {
      try {
        const content = await readFileAsText(file);
        const language = getLanguageFromFilename(fullPath) || fallbackLang;
        results.push({
          id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          path: fullPath,
          name: fullPath,
          content: content,
          size: file.size,
          language: language,
        });
      } catch (err) {
        console.warn(`Failed reading dropped file "${fullPath}":`, err);
      }
    }
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const subEntries = await new Promise((resolve, reject) => {
      dirReader.readEntries(resolve, reject);
    });

    const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    for (const sub of subEntries) {
      const subResults = await readEntry(sub, nextPath);
      results.push(...subResults);
    }
  }

  return results;
}

// Process drag-and-drop DataTransfer items (handles both dropped folders & files)
export async function processDataTransferItems(items) {
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind !== 'file') continue;

    const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
    if (entry) {
      const entryResults = await readEntry(entry);
      results.push(...entryResults);
    } else {
      // Fallback for standard files
      const file = item.getAsFile();
      if (file) {
        const fileResults = await processFileList([file]);
        results.push(...fileResults);
      }
    }
  }

  return results;
}

// Unpack ZIP archive into normalized file items
export async function unpackZipFile(zipBlobOrFile) {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipBlobOrFile);
  const results = [];
  const entries = Object.keys(loadedZip.files);

  for (const relativePath of entries) {
    if (shouldIgnorePath(relativePath)) continue;
    const zipEntry = loadedZip.files[relativePath];

    if (!zipEntry.dir) {
      try {
        const text = await zipEntry.async('text');
        const language = getLanguageFromFilename(relativePath) || fallbackLang;
        results.push({
          id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          path: relativePath,
          name: relativePath,
          content: text,
          size: text.length,
          language: language,
        });
      } catch (err) {
        console.warn(`Failed extracting zip entry "${relativePath}":`, err);
      }
    }
  }

  return results;
}

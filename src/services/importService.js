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
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

// Process standard files array (from `<input type="file" multiple />`)
export async function processNamedFiles(fileEntries) {
  const files = Array.from(fileEntries);
  const processed = await mapWithConcurrency(files, 6, async ({ file, path: relativePath = file.name }) => {
    if (shouldIgnorePath(relativePath)) return null;

    try {
      const content = await readFileAsText(file);
      const language = getLanguageFromFilename(relativePath) || fallbackLang;
      return {
        id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        path: relativePath,
        name: relativePath,
        content: content,
        size: file.size,
        language: language,
      };
    } catch (err) {
      console.warn(`Could not read file "${relativePath}":`, err);
      return null;
    }
  });
  return processed.filter(Boolean);
}

export async function processFileList(fileList) {
  return processNamedFiles(Array.from(fileList, (file) => ({
    file,
    path: file.webkitRelativePath || file.name,
  })));
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
    const subEntries = [];
    while (true) {
      const batch = await new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));
      if (batch.length === 0) break;
      subEntries.push(...batch);
    }

    const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    const childResults = await mapWithConcurrency(subEntries, 4, (sub) => readEntry(sub, nextPath));
    childResults.forEach((subResults) => results.push(...subResults));
  }

  return results;
}

// Process drag-and-drop DataTransfer items (handles both dropped folders & files)
export async function processDataTransferItems(items) {
  const fileItems = Array.from(items).filter((item) => item.kind === 'file');
  const nestedResults = await mapWithConcurrency(fileItems, 4, async (item) => {
    const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
    if (entry) {
      return readEntry(entry);
    }
    const file = item.getAsFile();
    return file ? processFileList([file]) : [];
  });
  return nestedResults.flat();
}

// Unpack ZIP archive into normalized file items
export async function unpackZipFile(zipBlobOrFile) {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipBlobOrFile);
  const entries = Object.keys(loadedZip.files);
  const processed = await mapWithConcurrency(entries, 4, async (relativePath) => {
    if (shouldIgnorePath(relativePath)) return null;
    const zipEntry = loadedZip.files[relativePath];

    if (zipEntry.dir) return null;
    try {
      const text = await zipEntry.async('text');
      const language = getLanguageFromFilename(relativePath) || fallbackLang;
      return {
        id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        path: relativePath,
        name: relativePath,
        content: text,
        size: text.length,
        language: language,
      };
    } catch (err) {
      console.warn(`Failed extracting zip entry "${relativePath}":`, err);
      return null;
    }
  });
  return processed.filter(Boolean);
}

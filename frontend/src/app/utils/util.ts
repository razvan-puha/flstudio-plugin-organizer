import JSZip from 'jszip';

interface ProcessedZipContent {
  fileName: string;
  content: string | ArrayBuffer;
}

export async function processZipFile(file: File): Promise<ProcessedZipContent[]> {
  try {
    const zip = new JSZip();
    const zipContents = await zip.loadAsync(file);
    const processedFiles: ProcessedZipContent[] = [];

    // Process each file in the zip
    const processPromises = Object.keys(zipContents.files).map(async (fileName) => {
      const zipEntry = zipContents.files[fileName];
      
      // Skip directories
      if (zipEntry.dir) return;

      // Read the file content
      const content = await zipEntry.async('string');
      processedFiles.push({
        fileName,
        content
      });
    });

    await Promise.all(processPromises);
    return processedFiles;
  } catch (error) {
    console.error('Error processing ZIP file:', error);
    throw new Error('Failed to process ZIP file');
  }
}
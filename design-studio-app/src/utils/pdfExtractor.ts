import * as pdfjsLib from 'pdfjs-dist';

// Define the workerSrc
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

export interface AIRegion {
  label: string;
  text: string;
  boundingBox: {
    x: string | number;
    y: string | number;
    w: string | number;
    h: string | number;
  };
}

export interface AITemplate {
  metadata: any;
  regions: AIRegion[];
}

export const extractDataFromPdf = async (file: File, template: AITemplate): Promise<Record<string, string>> => {
  const arrayBuffer = await file.arrayBuffer();
  const typedarray = new Uint8Array(arrayBuffer);
  
  const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();
  
  const extractedData: Record<string, string[]> = {};
  template.regions.forEach(r => extractedData[r.label] = []);

  textContent.items.forEach((item: any) => {
    // Transform coordinates
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));
    
    // Bottom-left of text is (tx[4], tx[5]). 
    // In pdf.js, top-left y is roughly tx[5] - fontHeight
    const textX = tx[4];
    const textY = tx[5] - fontHeight;
    const textW = item.width;
    const textH = fontHeight;
    
    // Convert to relative coordinates
    const relX = textX / viewport.width;
    const relY = textY / viewport.height;
    // Calculate the center of the text item for better intersection matching
    const relCenterX = relX + (textW / viewport.width) / 2;
    const relCenterY = relY + (textH / viewport.height) / 2;

    // Check which region it falls into
    for (const region of template.regions) {
      const rx = parseFloat(region.boundingBox.x as string);
      const ry = parseFloat(region.boundingBox.y as string);
      const rw = parseFloat(region.boundingBox.w as string);
      const rh = parseFloat(region.boundingBox.h as string);
      
      // If the text center is inside the region's bounding box
      if (
        relCenterX >= rx &&
        relCenterX <= rx + rw &&
        relCenterY >= ry &&
        relCenterY <= ry + rh
      ) {
        extractedData[region.label].push(item.str);
        break; // Only match to the first overlapping region
      }
    }
  });

  const result: Record<string, string> = {};
  for (const label in extractedData) {
    if (extractedData[label].length > 0) {
      result[label] = extractedData[label].join(' ').trim();
    }
  }
  
  return result;
};

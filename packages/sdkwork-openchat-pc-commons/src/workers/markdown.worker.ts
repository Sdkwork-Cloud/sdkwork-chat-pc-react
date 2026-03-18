

import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
});


function parseMarkdown(content: string): string {
  try {
    const rawHtml = marked.parse(content) as string;
    
    const cleanHtml = sanitizeHtml(rawHtml);
    
    return cleanHtml;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    return content;
  }
}


function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    .replace(/(?!src\s*=\s*["']data:image)\s+src\s*=\s*["']data:[^"']*["']/gi, '');
}


function parseChunks(content: string, chunkSize: number = 5000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  const lines = content.split('\n');
  
  for (const line of lines) {
    if ((currentChunk + line).length > chunkSize && currentChunk.length > 0) {
      chunks.push(parseMarkdown(currentChunk));
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(parseMarkdown(currentChunk));
  }
  
  return chunks;
}

self.onmessage = (event: MessageEvent) => {
  const { id, content, type = 'full' } = event.data;
  
  try {
    let result: string | string[];
    
    if (type === 'chunks' && content.length > 10000) {
      result = parseChunks(content);
    } else {
      result = parseMarkdown(content);
    }
    
    self.postMessage({
      id,
      result,
      success: true,
    });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    });
  }
};

export type MarkdownWorkerRequest = {
  id: string;
  content: string;
  type?: 'full' | 'chunks';
};

export type MarkdownWorkerResponse = {
  id: string;
  result?: string | string[];
  error?: string;
  success: boolean;
};

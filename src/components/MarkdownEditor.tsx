import { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link, 
  Image, 
  Heading1, 
  Heading2,
  Quote,
  Code,
  Eye,
  Edit
} from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder = 'Write your content here... Supports Markdown!',
  rows = 10,
  className = ''
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (prefix: string, suffix: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || placeholder;
    
    const newValue = 
      value.substring(0, start) + 
      prefix + selectedText + suffix + 
      value.substring(end);
    
    onChange(newValue);
    
    // Set cursor position after insert
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const toolbarButtons = [
    { icon: Bold, action: () => insertMarkdown('**', '**', 'bold text'), title: 'Bold' },
    { icon: Italic, action: () => insertMarkdown('*', '*', 'italic text'), title: 'Italic' },
    { icon: Heading1, action: () => insertMarkdown('# ', '', 'Heading'), title: 'Heading 1' },
    { icon: Heading2, action: () => insertMarkdown('## ', '', 'Heading'), title: 'Heading 2' },
    { icon: List, action: () => insertMarkdown('- ', '', 'List item'), title: 'Bullet List' },
    { icon: ListOrdered, action: () => insertMarkdown('1. ', '', 'List item'), title: 'Numbered List' },
    { icon: Quote, action: () => insertMarkdown('> ', '', 'Quote'), title: 'Quote' },
    { icon: Code, action: () => insertMarkdown('`', '`', 'code'), title: 'Inline Code' },
    { icon: Link, action: () => insertMarkdown('[', '](url)', 'link text'), title: 'Link' },
    { icon: Image, action: () => insertMarkdown('![', '](image-url)', 'alt text'), title: 'Image' },
  ];

  // Sanitize URLs to prevent XSS via javascript:, data:, vbscript: protocols
  const sanitizeUrl = (url: string): string => {
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    try {
      const trimmedUrl = url.trim();
      // Allow relative URLs and anchor links
      if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('#') || trimmedUrl.startsWith('./') || trimmedUrl.startsWith('../')) {
        return trimmedUrl;
      }
      const parsed = new URL(trimmedUrl, window.location.origin);
      if (!allowedProtocols.includes(parsed.protocol)) {
        return '#';
      }
      return trimmedUrl;
    } catch {
      // If URL parsing fails, block it unless it's a safe relative path
      return '#';
    }
  };

  const renderMarkdown = (text: string) => {
    // Simple markdown to HTML conversion
    let html = text
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      // Bold and Italic
      .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-muted p-3 rounded-md my-2 overflow-x-auto"><code>$1</code></pre>')
      .replace(/`(.*?)`/gim, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
      // Links and Images - with URL sanitization
      .replace(/!\[(.*?)\]\((.*?)\)/gim, (_, alt, url) => 
        `<img src="${sanitizeUrl(url)}" alt="${alt}" class="max-w-full h-auto rounded-md my-2" />`)
      .replace(/\[(.*?)\]\((.*?)\)/gim, (_, text, url) => 
        `<a href="${sanitizeUrl(url)}" class="text-primary underline" target="_blank" rel="noopener">${text}</a>`)
      // Blockquotes
      .replace(/^&gt; (.*$)/gim, '<blockquote class="border-l-4 border-primary pl-4 my-2 text-muted-foreground italic">$1</blockquote>')
      // Lists
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-6 list-decimal">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-6 list-disc">$1</li>')
      // Line breaks
      .replace(/\n\n/gim, '</p><p class="my-2">')
      .replace(/\n/gim, '<br />');

    return `<div class="prose prose-sm max-w-none dark:prose-invert"><p class="my-2">${html}</p></div>`;
  };

  return (
    <div className={`border rounded-md ${className}`}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
        <div className="flex items-center justify-between border-b px-2 py-1 bg-muted/30">
          {/* Toolbar */}
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {toolbarButtons.map((btn, i) => (
              <Button
                key={i}
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={btn.action}
                title={btn.title}
                disabled={activeTab === 'preview'}
              >
                <btn.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>

          {/* Tab Switcher */}
          <TabsList className="h-7">
            <TabsTrigger value="edit" className="text-xs h-6 px-2">
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs h-6 px-2">
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="edit" className="m-0">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="border-0 rounded-t-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-y"
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div 
            className="p-4 min-h-[200px] overflow-auto"
            style={{ minHeight: `${rows * 1.5}rem` }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
          />
        </TabsContent>
      </Tabs>

      <div className="px-3 py-1.5 bg-muted/30 border-t text-xs text-muted-foreground">
        Supports Markdown: **bold**, *italic*, # headings, [links](url), ![images](url), `code`, &gt; quotes
      </div>
    </div>
  );
}

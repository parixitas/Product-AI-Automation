import { Component, OnInit, inject } from '@angular/core';
import { PdfExtractService } from '../../services/pdf-extract-service';

import { ChatMessage, CreateProductDto, ProductRecord } from '../../models/product-chat';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GeminiChat } from '../../services/gemini-chat';
import { finalize } from 'rxjs';
import { marked } from 'marked';
import { ApiServices } from '../../services/api-services';


@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private pdfService = inject(PdfExtractService);
  private aiService = inject(GeminiChat); // Inject AI Service
  private apiService = inject(ApiServices); // Inject API Service

  searchQuery: string = '';
  archiveQuery: string = '';
  sidebarOpen = false;
  lastUploadedFile: { name: string; size: string } | null = null;
  extractedProducts: ProductRecord[] = [];
  isThinking: boolean = false;
  isDragging = false;
  copiedId: string | null = null;
  activeDocId: string | null = null;

  suggestionPrompts: string[] = [
    'What is the total stock value?',
    'Which product has the highest price?',
    'Summarise quantity by category',
    'List all out-of-stock products',
  ];

  demoDocs = [
    { id: 'demo-1', title: 'Catalog-Q3.pdf', specs: 'Electronics • 12 products', time: 'Just now', kind: 'PDF', status: 'Stored in DB' },
    { id: 'demo-2', title: 'Price-List-2026.pdf', specs: 'Apparel • 8 products', time: '2d ago', kind: 'PDF', status: 'Stored in DB' },
    { id: 'demo-3', title: 'Inventory_Matrix_Q3.xlsx', specs: 'Multi-category stock', time: 'Aug 28', kind: 'XLS', status: 'Synced' },
  ];

  messages: ChatMessage[] = [
    {
      id: '1',
      sender: 'assistant',
      text: 'Vault ready. Upload your product PDF or ask any question about prices, stock, or categories.',
      timestamp: new Date()
    }
  ];

  ngOnInit(): void {
    // Pre-load existing products from backend so chat works without an upload.
    this.apiService.getAllProductsList().subscribe({
      next: (list) => {
        this.extractedProducts = (list ?? []).map((p) => this.toRecord(p));
      },
      error: (err) => console.error('Failed to preload products:', err),
    });
  }

  private toRecord(p: any): ProductRecord {
    return {
      productId: p?.productId,
      productName: p?.productName ?? 'Unnamed product',
      description: p?.description ?? '',
      price: Number(p?.price) || 0,
      quantity: Number(p?.quantity) || 0,
      category: p?.category ?? '',
      brand: p?.brand ?? '',
      productImage: p?.productImage ?? null,
      isActive: p?.isActive ?? true,
      fileName: p?.fileName ?? '',
      fileSize: '',
      uploadDate: p?.createdAt ? new Date(p.createdAt) : new Date(),
      status: 'indexed',
    };
  }

  get inventoryCount(): number {
    return this.extractedProducts.length > 0 ? this.extractedProducts.length : 0;
  }

  get totalQuantity(): string {
    if (!this.extractedProducts.length) return '—';
    const total = this.extractedProducts.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
    return `${total} units`;
  }

  get totalValue(): string {
    if (!this.extractedProducts.length) return '—';
    const total = this.extractedProducts.reduce(
      (s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 0),
      0
    );
    return `$${total.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }

  get filteredDocs() {
    const q = this.archiveQuery.trim().toLowerCase();
    if (!q) return this.demoDocs;
    return this.demoDocs.filter(
      (d) => d.title.toLowerCase().includes(q) || d.specs.toLowerCase().includes(q)
    );
  }

  get showHero(): boolean {
    return this.messages.length <= 1 && !this.lastUploadedFile;
  }

  trackById(_i: number, m: ChatMessage) {
    return m.id;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  selectDoc(id: string): void {
    this.activeDocId = id;
    this.closeSidebar();
  }

  askSuggestion(prompt: string): void {
    this.searchQuery = prompt;
    this.sendMessage();
  }

  askPill(prompt: string): void {
    this.searchQuery = prompt;
    this.sendMessage();
  }

  dismissUpload(): void {
    this.lastUploadedFile = null;
  }

  clearChat(): void {
    this.messages = [
      {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: 'Fresh vault opened. Upload a product catalog or ask me anything about your products.',
        timestamp: new Date(),
      },
    ];
    this.lastUploadedFile = null;
  }

  copyReply(msg: ChatMessage): void {
    if (!msg.text) return;
    const done = () => {
      this.copiedId = msg.id;
      setTimeout(() => (this.copiedId = null), 1400);
    };
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(msg.text).then(done).catch(done);
    } else {
      done();
    }
  }

  onDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragging = false;
  }

  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragging = false;
    const file = ev.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
  }

  renderMarkdown(text: string | undefined): string {
    return marked.parse(text ?? '', { gfm: true, breaks: true, async: false });
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    await this.handleFile(file);
    input.value = '';
  }

  private async handleFile(file: File): Promise<void> {
    const formattedFileSize = `${(file.size / 1024).toFixed(1)} KB`;

    this.lastUploadedFile = {
      name: file.name,
      size: formattedFileSize
    };

    try {
      const isPdf = /\.pdf$/i.test(file.name) || file.type.includes('pdf');
      if (!isPdf) {
        this.messages.push({
          id: crypto.randomUUID(),
          sender: 'assistant',
          text: `**${file.name}** was attached, but only PDF catalogs can be auto-parsed in the browser. Your existing inventory is still loaded — ask me anything.`,
          timestamp: new Date()
        });
        return;
      }
      const extractedContent = await this.pdfService.extractAllText(file);
      console.log('PDF raw text (first 2000 chars):', extractedContent.slice(0, 2000));

      const newlyExtracted = this.parseProducts(extractedContent, file.name, formattedFileSize);

      if (newlyExtracted.length === 0) {
        this.messages.push({
          id: crypto.randomUUID(),
          sender: 'assistant',
          text: `I read **${file.name}** but couldn't recognise any product rows. Expected columns like: \`ProductName | Description | Price | Quantity | Category | Brand\` (e.g. \`iPhone 15 Pro | Latest Apple smartphone | 999.99 | 10 | Electronics | Apple\`). The raw text is logged to the console — please check the PDF layout. Your existing inventory is still available for questions.`,
          timestamp: new Date()
        });
        return;
      }

      // Optimistic local add, then persist via Product bulk API.
      this.extractedProducts.push(...newlyExtracted);
      console.log('Extracted Products:', newlyExtracted);

      const payload: CreateProductDto[] = newlyExtracted.map((p) => ({
        productName: p.productName,
        description: p.description ?? '',
        price: Number(p.price) || 0,
        quantity: Math.trunc(Number(p.quantity)) || 0,
        category: p.category ?? '',
        brand: p.brand ?? '',
        productImage: p.productImage ?? null,
        isActive: p.isActive ?? true,
      }));

      this.apiService.addProducts(payload).subscribe({
        next: (response) => {
          console.log('Products saved successfully:', response);
          if (Array.isArray(response) && response.length > 0) {
            // Replace optimistic rows for this file with server-confirmed rows.
            const names = new Set(payload.map((p) => p.productName));
            this.extractedProducts = this.extractedProducts.filter(
              (p) => !(p.fileName === file.name && names.has(p.productName) && p.productId == null)
            );
            this.extractedProducts.push(...response.map((p) => this.toRecord({ ...p, fileName: file.name })));
          }
        },
        error: (error) => {
          console.error('Error saving products:', error);
          this.messages.push({
            id: crypto.randomUUID(),
            sender: 'assistant',
            text: `Parsed ${newlyExtracted.length} products from **${file.name}**, but saving to the backend failed (${error?.message ?? error?.status ?? 'unknown error'}). They are kept locally for this session.`,
            timestamp: new Date()
          });
        }
      });

      this.messages.push({
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: `Indexed ${newlyExtracted.length} products from ${file.name}. You can now ask anything (e.g. "What is the total stock value?", "Which product has the highest price?", "Summarise quantity by category").`,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('PDF parsing error:', error);
    }
  }

  /**
   * Parses product rows from raw PDF text into CreateProductDto-shaped records.
   * Supports:
   *  A) Delimited rows (preferred): `Name | Description | Price | Qty | Category | Brand`
   *     separators: `|`, `;`, tab, or 2+ spaces. Header row optional.
   *  B) Loose rows: `<name> $<price> <qty> [<category>] [<brand>]`
   */
  private parseProducts(raw: string, fileName: string, fileSize: string): ProductRecord[] {
    const out: ProductRecord[] = [];
    const lines = raw
      .split(/\n+/)
      .map((l) => l.replace(/--- Page \d+ ---/gi, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim())
      .filter((l) => l.length > 3);

    const splitRow = (line: string): string[] | null => {
      if (line.includes('|')) return line.split('|').map((s) => s.trim());
      if (line.includes(';')) return line.split(';').map((s) => s.trim());
      if (line.includes('\t')) return line.split('\t').map((s) => s.trim());
      if (/,/.test(line) && /\d/.test(line)) {
        const parts = line.split(',').map((s) => s.trim());
        if (parts.length >= 4) return parts;
      }
      const parts = line.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 4) return parts;
      return null;
    };

    const isHeader = (cells: string[]): boolean => {
      const joined = cells.join(' ').toLowerCase();
      const hits = ['product', 'price', 'quantity', 'qty', 'category', 'brand', 'description']
        .filter((k) => joined.includes(k)).length;
      return hits >= 2;
    };

    const num = (v: string | undefined): number => {
      if (!v) return NaN;
      const cleaned = v.replace(/[$,]/g, '').replace(/[^\d.\-]/g, '');
      return parseFloat(cleaned);
    };

    const int = (v: string | undefined): number => {
      if (!v) return NaN;
      const cleaned = v.replace(/,/g, '').replace(/[^\d\-]/g, '');
      return parseInt(cleaned, 10);
    };

    const toRecord = (dto: CreateProductDto): ProductRecord => ({
      ...dto,
      fileName,
      fileSize,
      uploadDate: new Date(),
      status: 'indexed',
    });

    // ── Pass A: delimited table rows ──
    for (const line of lines) {
      const cells = splitRow(line);
      if (!cells || cells.length < 3) continue;
      if (isHeader(cells)) continue;

      // Heuristic column mapping by position:
      // [0]=name, [1]=description?, [..]=price, [..]=qty, [..]=category, [..]=brand
      const priceIdx = cells.findIndex((c) => /\$?\s*[\d,]+\.\d{2}|\$/.test(c) || /price/i.test(c));
      let dto: CreateProductDto | null = null;

      if (cells.length >= 6) {
        const price = num(cells[2]);
        const qty = int(cells[3]);
        if (!isNaN(price) && !isNaN(qty)) {
          dto = {
            productName: cells[0] || `Product-${out.length + 1}`,
            description: cells[1] || '',
            price,
            quantity: qty,
            category: cells[4] || '',
            brand: cells[5] || '',
            productImage: cells[6] ?? null,
            isActive: qty > 0,
          };
        }
      }

      if (!dto && priceIdx >= 0) {
        const price = num(cells[priceIdx]);
        const qtyCell = cells[priceIdx + 1] ?? cells[priceIdx - 1] ?? '';
        const qty = int(qtyCell);
        if (!isNaN(price) && !isNaN(qty)) {
          dto = {
            productName: cells[0] || `Product-${out.length + 1}`,
            description: cells.length > 3 ? cells[1] : '',
            price,
            quantity: qty,
            category: cells[priceIdx + 2] ?? '',
            brand: cells[priceIdx + 3] ?? '',
            productImage: null,
            isActive: qty > 0,
          };
        }
      }

      if (dto && dto.productName && dto.price >= 0 && dto.quantity >= 0) out.push(toRecord(dto));
    }
    if (out.length > 0) return out;

    // ── Pass B: loose "<name> <price> <qty> [category] [brand]" rows over flattened text ──
    const flat = lines.join(' ');
    const looseRegex = /([A-Za-z0-9][A-Za-z0-9\s.'\-&()]{2,48}?)\s+\$?\s*([\d,]+\.\d{2})\s+(?:qty\s*[:#-]?\s*)?(\d{1,6})\s*(?:pcs|units|qty)?\s*([A-Za-z][A-Za-z &\-]{2,28})?(?:\s+([A-Za-z][A-Za-z &\-]{2,28}))?/gi;
    let m: RegExpExecArray | null;
    while ((m = looseRegex.exec(flat)) !== null) {
      const price = num(m[2]);
      const qty = int(m[3]);
      if (isNaN(price) || isNaN(qty)) continue;
      const name = m[1].trim().replace(/^(product|name|item)\s*[:#-]\s*/i, '');
      if (name.length < 2) continue;
      out.push(toRecord({
        productName: name,
        description: '',
        price,
        quantity: qty,
        category: (m[4] ?? '').trim(),
        brand: (m[5] ?? '').trim(),
        productImage: null,
        isActive: qty > 0,
      }));
      if (out.length >= 500) break;
    }
    return out;
  }

  sendMessage(): void {
  const query = this.searchQuery.trim();
  if (!query || this.isThinking) return;

  // 1. Append User Message
  this.messages.push({
    id: crypto.randomUUID(),
    sender: 'user',
    text: query,
    timestamp: new Date()
  });

  this.searchQuery = '';
  this.isThinking = true;

  this.apiService.getAllProductsList().subscribe({
    next: (list) => {
      this.extractedProducts = (list ?? []).map((p) => this.toRecord(p));
      console.log('Fetched all products:', this.extractedProducts);
      // 2. Call Gemini (with auto re-call: change model + retry whole chain once)
      this.callGeminiWithAutoRetry(query, this.extractedProducts, 0);
    },
    error: (err) => {
      console.error('Backend error:', err);
      // Backend down — still try Gemini with whatever is in memory
      this.callGeminiWithAutoRetry(query, this.extractedProducts, 0);
    }
  });

}

  /**
   * Calls Gemini; if the whole model chain fails ("Unable to communicate…"),
   * changes the start model and calls again automatically (max 1 re-call).
   */
  private callGeminiWithAutoRetry(query: string, products: any[], cycle: number): void {
    const MAX_CYCLES = 1; // 0 = first full chain, 1 = one automatic re-call with rotated start
    const startIndex = cycle; // cycle 1 starts from model[1] instead of model[0]

    this.aiService.askAboutInventory(query, products, startIndex).pipe(
      finalize(() => {
        if (cycle >= MAX_CYCLES) this.isThinking = false;
      })
    ).subscribe({
      next: (reply) => {
        this.isThinking = false;
        this.messages.push({
          id: crypto.randomUUID(),
          sender: 'assistant',
          text: reply,
          timestamp: new Date()
        });
      },
      error: (err) => {
        console.error(`Gemini cycle ${cycle} failed:`, err);
        if (cycle < MAX_CYCLES) {
          console.warn(`[Gemini] full chain failed, re-calling again from next model…`);
          setTimeout(() => this.callGeminiWithAutoRetry(query, products, cycle + 1), 1500);
          return;
        }
        this.isThinking = false;
        const reason = (err as any)?.error?.error?.message || err?.message || `HTTP ${err?.status}`;
        this.messages.push({
          id: crypto.randomUUID(),
          sender: 'assistant',
          text: `Unable to communicate with the Gemini engine after trying all models (${reason}). ` +
            `I already changed the model and called again. Please check your API key / connection and send the message again.`,
          timestamp: new Date()
        });
      }
    });
  }

  /** Manual retry for the last user query (wire to a Retry button if needed). */
  retryLast(): void {
    const lastUser = [...this.messages].reverse().find(m => m.sender === 'user');
    if (lastUser?.text && !this.isThinking) {
      this.isThinking = true;
      this.callGeminiWithAutoRetry(lastUser.text, this.extractedProducts, 0);
    }
  }
}

import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, defer, map, Observable, switchMap, throwError, timer } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class GeminiChat {
  private apiKey = (environment as any).apiKey as string;

  private baseUrl =
    (environment as any).geminiBaseUrl ??
    'https://generativelanguage.googleapis.com/v1beta/models';

  // Ordered fallback chain — highest quota first. Edit in environment.* files.
  private models: string[] =
    (environment as any).geminiModels ?? [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-2.5-flash',
      'gemini-3-flash',
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-3.8-flash',
    ];

  /** Last model that succeeded — useful for debugging / UI badge. */
  public lastUsedModel: string | null = null;

  /** Round-robin cursor so consecutive chats don't all hammer model[0]. */
  private roundRobin = 0;

  constructor(private http: HttpClient) {
    if (this.apiKey && !this.apiKey.startsWith('AIza')) {
      console.warn(
        '[Gemini] apiKey does not look like a standard Gemini key (should start with "AIza"). ' +
          'If every model fails with 400/403, check AI Studio key.'
      );
    }
  }

  askAboutInventory(
    userPrompt: string,
    productContext: any[],
    startIndex?: number
  ): Observable<string> {
    const promptText = `
You are Aethera ProductAI, an expert product-catalog assistant.
Here is the indexed product inventory extracted from the uploaded dossier:
${JSON.stringify(productContext, null, 2)}

User Question: ${userPrompt}

Instructions:
1. Answer accurately based on the inventory above (fields: productName, description, price, quantity, category, brand, isActive).
2. If asked for totals, averages, or counts (e.g. total stock value = sum(price * quantity), total units, product count, average price), calculate and state the exact numbers.
3. If asked about categories, brands, price ranges, or comparisons, format clearly with bullet points and line breaks.
4. Keep the tone concise and professional.
`;

    const payload = {
      contents: [
        {
          parts: [{ text: promptText }],
        },
      ],
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    // Rotate start model each call so quota spreads across models.
    // Explicit startIndex (used for re-call after full exhaustion) overrides rotation.
    const start =
      typeof startIndex === 'number'
        ? ((startIndex % this.models.length) + this.models.length) % this.models.length
        : this.roundRobin++ % this.models.length;
    const ordered = this.rotatedModels(start);

    return defer(() => this.tryModel(payload, headers, ordered, 0, []));
  }

  private rotatedModels(start: number): string[] {
    return [...this.models.slice(start), ...this.models.slice(0, start)];
  }

  private tryModel(
    payload: unknown,
    headers: HttpHeaders,
    ordered: string[],
    index: number,
    tried: string[]
  ): Observable<string> {
    if (index >= ordered.length) {
      const detail = tried.length ? `Tried: ${tried.join(' → ')}` : 'No models tried';
      return throwError(
        () => new Error(`All Gemini models failed. ${detail}.`)
      );
    }

    const model = ordered[index];
    const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

    return this.http.post<any>(url, payload, { headers }).pipe(
      map((res) => res?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated from Gemini.'),
      map((text) => {
        this.lastUsedModel = model;
        return text;
      }),
      catchError((err: HttpErrorResponse) => {
        // Per requirement: on ANY failure, change model and call again.
        // No error type stops the chain — we exhaust every model before surfacing.
        const triedNow = [...tried, `${model}(${this.describeError(err)})`];
        if (index === ordered.length - 1) {
          const detail = `Tried: ${triedNow.join(' → ')}`;
          console.error(`[Gemini] all ${ordered.length} models failed. ${detail}`);
          return throwError(() => err);
        }
        console.warn(
          `[Gemini] ${model} failed (${this.describeError(err)}). Trying ${ordered[index + 1]}…`
        );
        // Small backoff on 429 so we don't hammer the next model instantly.
        const backoffMs = err?.status === 429 ? 800 : 250;
        return timer(backoffMs).pipe(
          switchMap(() => this.tryModel(payload, headers, ordered, index + 1, triedNow))
        );
      })
    );
  }

  private describeError(err: HttpErrorResponse): string {
    const apiMsg = (err as any)?.error?.error?.message;
    return `HTTP ${err?.status} ${apiMsg ?? err?.message ?? 'unknown'}`;
  }
}

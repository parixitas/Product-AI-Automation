import { TestBed } from '@angular/core/testing';

import { GeminiChat } from './gemini-chat';

describe('GeminiChat', () => {
  let service: GeminiChat;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeminiChat);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

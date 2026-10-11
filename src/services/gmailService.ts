import { getAccessToken } from './googleAuth';

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  isUnread: boolean;
  hasAttachment: boolean;
}

export interface GmailMessageDetail extends GmailMessageSummary {
  body: string;
  headers: Record<string, string>;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

/**
 * Base64URL encode for Gmail API RFC 2822 email messages
 */
function base64UrlEncode(str: string): string {
  // UTF-8 to Base64
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return str;
  }
}

/**
 * Fetch authenticated user Gmail profile
 */
export async function getGmailProfile(): Promise<GmailProfile | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * List messages in Gmail inbox
 */
export async function listGmailMessages(
  query: string = '',
  maxResults: number = 20
): Promise<GmailMessageSummary[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Hujajiunga na Google. Tafadhali ingia na Google kwanza.');
  }

  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.set('maxResults', String(maxResults));
  if (query.trim()) {
    url.searchParams.set('q', query.trim());
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Hitilafu ya kusoma barua pepe kutoka Gmail.');
  }

  const data = await res.json();
  const rawList: { id: string; threadId: string }[] = data.messages || [];
  if (rawList.length === 0) return [];

  // Fetch summaries for each message (first 10 for performance)
  const summaries = await Promise.all(
    rawList.slice(0, 15).map(async (msg) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!detailRes.ok) return null;
        const detail = await detailRes.json();

        const headers: Record<string, string> = {};
        (detail.payload?.headers || []).forEach((h: any) => {
          headers[h.name.toLowerCase()] = h.value;
        });

        const isUnread = (detail.labelIds || []).includes('UNREAD');

        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: detail.snippet || '',
          from: headers['from'] || 'Unknown Sender',
          to: headers['to'] || '',
          subject: headers['subject'] || '(Bila Kichwa / No Subject)',
          date: headers['date'] || '',
          isUnread,
          hasAttachment: (detail.labelIds || []).includes('ATTACHMENT'),
        };
      } catch {
        return null;
      }
    })
  );

  return summaries.filter((s): s is GmailMessageSummary => s !== null);
}

/**
 * Fetch full message details
 */
export async function getGmailMessageDetail(messageId: string): Promise<GmailMessageDetail> {
  const token = await getAccessToken();
  if (!token) throw new Error('Hujajiunga na Google.');

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Haikuweza kupata ujumbe huu kutoka Gmail.');
  }

  const detail = await res.json();
  const headers: Record<string, string> = {};
  (detail.payload?.headers || []).forEach((h: any) => {
    headers[h.name.toLowerCase()] = h.value;
  });

  // Extract body text
  let body = '';
  if (detail.payload?.parts) {
    const textPart = detail.payload.parts.find((p: any) => p.mimeType === 'text/plain') || detail.payload.parts[0];
    if (textPart?.body?.data) {
      body = base64UrlDecode(textPart.body.data);
    }
  } else if (detail.payload?.body?.data) {
    body = base64UrlDecode(detail.payload.body.data);
  }

  if (!body) {
    body = detail.snippet || '';
  }

  return {
    id: detail.id,
    threadId: detail.threadId,
    snippet: detail.snippet || '',
    from: headers['from'] || '',
    to: headers['to'] || '',
    subject: headers['subject'] || '(Bila Kichwa)',
    date: headers['date'] || '',
    isUnread: (detail.labelIds || []).includes('UNREAD'),
    hasAttachment: (detail.labelIds || []).includes('ATTACHMENT'),
    body,
    headers,
  };
}

/**
 * Send an email via Gmail API
 * Note: MANDATORY confirmation must be asked in the UI before calling this!
 */
export async function sendGmailEmail(params: {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
}): Promise<{ success: boolean; messageId: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Hujajiunga na Google.');

  const emailLines = [
    `To: ${params.to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.body,
  ];

  const rawMessage = emailLines.join('\r\n');
  const encoded = base64UrlEncode(rawMessage);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Hitilafu ya kutuma barua pepe kupitia Gmail.');
  }

  const data = await res.json();
  return { success: true, messageId: data.id };
}

/**
 * Move email to trash (MANDATORY explicit confirmation required prior to execution)
 */
export async function trashGmailMessage(messageId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) throw new Error('Hujajiunga na Google.');

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.ok;
}

/**
 * Mark email as read by removing UNREAD label
 */
export async function markGmailAsRead(messageId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
  });

  return res.ok;
}

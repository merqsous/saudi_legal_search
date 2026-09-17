'use client';

import { useEffect } from 'react';

const KNOWN_SOURCES: { match: (host: string) => boolean; label: string }[] = [
  { match: (h) => h.includes('google'), label: 'Google' },
  { match: (h) => h.includes('bing'), label: 'Bing' },
  { match: (h) => h.includes('linkedin') || h.includes('lnkd'), label: 'LinkedIn' },
  { match: (h) => h.includes('x.com') || h.includes('twitter') || h === 't.co', label: 'X (Twitter)' },
  { match: (h) => h.includes('facebook') || h.includes('fb.com') || h === 'fb.me', label: 'Facebook' },
  { match: (h) => h.includes('instagram'), label: 'Instagram' },
  { match: (h) => h.includes('youtube') || h === 'youtu.be', label: 'YouTube' },
  { match: (h) => h.includes('whatsapp'), label: 'WhatsApp' },
  { match: (h) => h.includes('snapchat'), label: 'Snapchat' },
  { match: (h) => h.includes('reddit'), label: 'Reddit' },
  { match: (h) => h.includes('telegram') || h === 't.me', label: 'Telegram' },
  { match: (h) => h.includes('tiktok'), label: 'TikTok' },
];

function sourceFromReferrer(referrer: string): string {
  if (!referrer) return 'Direct';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (host.includes('albaheth.app')) return 'Direct'; // internal navigation
    const known = KNOWN_SOURCES.find((s) => s.match(host));
    if (known) return known.label;
    return host; // some other site that linked to us
  } catch {
    return 'Direct';
  }
}

export function getVisitSource(): { source: string; medium: string; campaign: string } {
  if (typeof window === 'undefined') return { source: '', medium: '', campaign: '' };
  return {
    source: localStorage.getItem('visit_source') || '',
    medium: localStorage.getItem('visit_medium') || '',
    campaign: localStorage.getItem('visit_campaign') || '',
  };
}

export default function VisitTracker() {
  useEffect(() => {
    // First-touch attribution: only capture on the very first visit
    if (localStorage.getItem('visit_source')) return;

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');

    let source = '';
    let medium = utmMedium || '';
    let campaign = utmCampaign || '';

    if (utmSource) {
      // UTM params present (e.g. from ads or campaign links)
      source = utmSource;
      if (!medium) medium = 'campaign';
    } else if (params.get('gclid')) {
      // Google Ads auto-tagging
      source = 'Google Ads';
      medium = 'cpc';
    } else if (params.get('fbclid')) {
      source = 'Facebook Ads';
      medium = 'cpc';
    } else if (params.get('msclkid')) {
      source = 'Bing Ads';
      medium = 'cpc';
    } else {
      // Fall back to the referring site
      source = sourceFromReferrer(document.referrer);
      if (source !== 'Direct') medium = medium || 'referral';
    }

    localStorage.setItem('visit_source', source);
    localStorage.setItem('visit_medium', medium);
    localStorage.setItem('visit_campaign', campaign);
  }, []);

  return null;
}

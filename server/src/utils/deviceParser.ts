import { Request } from 'express';

export interface DeviceInfo {
  deviceType: 'Mobile (Phone)' | 'Tablet' | 'Desktop / Laptop';
  browser: string;
  os: string;
  ipAddress: string;
  city: string | null;
  country: string | null;
  userAgent: string;
}

export function parseDeviceInfo(req: Request): DeviceInfo {
  const ua = req.headers['user-agent'] || '';

  // Extract client IP address (checks proxy headers on Vercel / Cloudflare)
  const forwarded = req.headers['x-forwarded-for'];
  let ipAddress = '127.0.0.1';
  if (typeof forwarded === 'string') {
    ipAddress = forwarded.split(',')[0].trim();
  } else if (req.socket?.remoteAddress) {
    ipAddress = req.socket.remoteAddress;
  }

  // Location from Vercel edge headers if available
  const city = (req.headers['x-vercel-ip-city'] as string) || null;
  const country = (req.headers['x-vercel-ip-country'] as string) || null;

  // Device type detection
  let deviceType: 'Mobile (Phone)' | 'Tablet' | 'Desktop / Laptop' = 'Desktop / Laptop';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    deviceType = 'Mobile (Phone)';
  }

  // OS detection
  let os = 'Unknown OS';
  if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';

  // Browser detection
  let browser = 'Unknown Browser';
  if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome/i.test(ua) && !/Chromium|Edg|OPR/i.test(ua)) browser = 'Google Chrome';
  else if (/Safari/i.test(ua) && !/Chrome|Chromium/i.test(ua)) browser = 'Apple Safari';
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';

  return {
    deviceType,
    browser,
    os,
    ipAddress,
    city,
    country,
    userAgent: ua.substring(0, 500),
  };
}


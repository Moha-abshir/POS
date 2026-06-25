import { S3Client } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL;

const isConfigured = accountId && accessKeyId && secretAccessKey && bucketName && publicUrl;

if (!isConfigured) {
  console.warn('[R2 Config Warning]: Cloudflare R2 is not fully configured. Image uploads will fail.');
}

export const r2Client = new S3Client({
  endpoint: `https://${accountId || 'dummy'}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId || 'dummy',
    secretAccessKey: secretAccessKey || 'dummy',
  },
  region: 'auto',
});

export const R2_BUCKET_NAME = bucketName || '';
export const R2_PUBLIC_URL = publicUrl || '';
export const R2_IS_CONFIGURED = !!isConfigured;

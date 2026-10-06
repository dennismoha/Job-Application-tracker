import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import { v2 as cloudinary } from 'cloudinary';

import { env } from '../../config/env.js';
import { ServiceUnavailableError } from '../../shared/http/http-error.js';

function configureCloudinary(): void {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new ServiceUnavailableError(
      'CV uploads require CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
    );
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function extension(fileName: string): string {
  const value = extname(fileName).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(value) ? value : '';
}

function resultStatus(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('result' in value)) return null;
  return typeof value.result === 'string' ? value.result : null;
}

export async function uploadCvOriginal(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  configureCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        type: 'authenticated',
        folder: 'cv-originals',
        public_id: `${randomUUID()}${extension(fileName)}`,
        filename_override: fileName,
        use_filename: false,
        unique_filename: false,
        overwrite: false,
        context: { mime_type: mimeType },
      },
      (error, result) => {
        if (error) {
          reject(new Error(error.message));
          return;
        }
        if (!result?.public_id) {
          reject(new Error('Cloudinary did not return an asset ID for the uploaded CV.'));
          return;
        }
        resolve(result.public_id);
      },
    );
    stream.end(buffer);
  });
}

export async function deleteCvOriginal(publicId: string): Promise<void> {
  configureCloudinary();
  const result: unknown = await cloudinary.uploader.destroy(publicId, {
    resource_type: 'raw',
    type: 'authenticated',
    invalidate: true,
  });
  const status = resultStatus(result);
  if (!status || !['ok', 'not found'].includes(status)) {
    throw new Error(
      `Cloudinary did not delete the uploaded CV asset (${status ?? 'unknown result'}).`,
    );
  }
}

export function createCvPreviewUrl(publicId: string): string {
  configureCloudinary();
  return cloudinary.utils.private_download_url(publicId, '', {
    resource_type: 'raw',
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 10 * 60,
    attachment: false,
  });
}

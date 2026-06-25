import { Request, Response, NextFunction } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL, R2_IS_CONFIGURED } from '../../core/config/r2';
import { AppError } from '../../core/utils/AppError';
import sharp from 'sharp';

export class UploadController {
  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!R2_IS_CONFIGURED) {
        throw new AppError('Cloudflare R2 storage is not configured on this server.', 503);
      }

      if (!req.file) {
        throw new AppError('No file uploaded.', 400);
      }

      if (!req.file.mimetype.startsWith('image/')) {
        throw new AppError('Uploaded file must be an image.', 400);
      }

      let compressedBuffer: Buffer;
      try {
        compressedBuffer = await sharp(req.file.buffer)
          .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 80 })
          .toBuffer();
      } catch (sharpError: any) {
        throw new AppError(`Failed to process image: ${sharpError.message}`, 400);
      }

      const timestamp = Date.now();
      const originalBaseName = req.file.originalname.split('.')[0] || 'upload';
      const sanitizedName = originalBaseName
        .replace(/[^a-zA-Z0-9]/g, '-')
        .toLowerCase();
      const key = `${timestamp}-${sanitizedName}.webp`;

      try {
        const uploadParams = {
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: compressedBuffer,
          ContentType: 'image/webp',
        };
        await r2Client.send(new PutObjectCommand(uploadParams));
      } catch (s3Error: any) {
        throw new AppError(`Storage upload failed: ${s3Error.message}`, 502);
      }

      const imageUrl = `${R2_PUBLIC_URL}/${key}`;

      res.status(200).json({
        success: true,
        data: {
          imageUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

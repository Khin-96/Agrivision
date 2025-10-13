// lib/storage.ts
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// Configure S3 client (you can replace this with your preferred storage)
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadImageToStorage(file: File, path: string): Promise<string> {
  try {
    // For demo purposes, we'll use a mock URL
    // In production, implement actual file upload to S3, Cloudinary, etc.
    const mockUrl = `https://picsum.photos/400/300?random=${uuidv4()}`;
    return mockUrl;
    
    // Actual implementation would look like this:
    /*
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `${path}/${uuidv4()}-${file.name}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });
    
    await s3Client.send(command);
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    */
  } catch (error) {
    console.error('Storage upload error:', error);
    throw new Error('Failed to upload image');
  }
}
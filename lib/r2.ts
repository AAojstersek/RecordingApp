import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Server-only module - ensure this is not imported in client components
if (typeof window !== "undefined") {
  throw new Error("lib/r2.ts is server-only and cannot be imported in client components");
}

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  throw new Error(
    "Missing required R2 environment variables: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
  );
}

const s3Client = new S3Client({
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto",
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a buffer to R2 storage
 * @param buffer - The file buffer to upload
 * @param key - The R2 object key (path/filename)
 * @param contentType - Optional MIME type (e.g., 'audio/mpeg', 'audio/wav')
 * @throws Error if upload fails
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType?: string
): Promise<void> {
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
  } catch (error) {
    throw new Error(`Failed to upload to R2: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generates a presigned URL for accessing an R2 object
 * @param key - The R2 object key (path/filename)
 * @param expiresInSeconds - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns Presigned URL string
 * @throws Error if URL generation fails
 */
export async function getSignedR2Url(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    return url;
  } catch (error) {
    throw new Error(`Failed to generate signed R2 URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}


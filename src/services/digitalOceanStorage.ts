import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const endpoint = process.env.DO_SPACE_ENDPOINT;
const region = process.env.DO_SPACE_REGION;
const bucket = process.env.DO_SPACE_NAME;
const publicBase = process.env.DO_SPACE_PUBLIC_BASE;

if (!endpoint || !region || !bucket || !publicBase) {
  throw new Error(
    "DigitalOcean Spaces configuration is missing. Set DO_SPACE_ENDPOINT, DO_SPACE_REGION, DO_SPACE_NAME, and DO_SPACE_PUBLIC_BASE in env.",
  );
}

const s3 = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId: process.env.DO_SPACE_KEY as string,
    secretAccessKey: process.env.DO_SPACE_SECRET as string,
  },
});

export const uploadBufferToSpaces = async (
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: "public-read",
  });

  await s3.send(command);
  return `${publicBase}/${key}`;
};

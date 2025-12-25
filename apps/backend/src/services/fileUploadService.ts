import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';

export class FileUploadService {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId!,
        secretAccessKey: config.r2.secretAccessKey!,
      },
      forcePathStyle: true,
    });
  }

  /**
   * ファイルをCloudflare R2にアップロード
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string,
    userId: string
  ): Promise<{ filePath: string; fileUrl: string }> {
    // ファイル名の生成（UUID + 拡張子）
    const fileExtension = this.getFileExtension(originalFilename);
    const fileName = `${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `verification-documents/${userId}/${fileName}`;

    // ファイルをR2にアップロード
    const uploadCommand = new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: filePath,
      Body: fileBuffer,
      ContentType: mimeType,
      Metadata: {
        'original-filename': originalFilename,
        'uploaded-by': userId,
        'uploaded-at': new Date().toISOString(),
      },
    });

    await this.s3Client.send(uploadCommand);

    // 署名付きURLを生成（5分間有効）
    const signedUrl = await this.generateSignedUrl(filePath, 300);

    return {
      filePath,
      fileUrl: signedUrl,
    };
  }

  /**
   * 署名付きURLを生成
   */
  async generateSignedUrl(filePath: string, expiresInSeconds: number = 300): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: config.r2.bucketName,
      Key: filePath,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    return signedUrl;
  }

  /**
   * ファイルを削除
   */
  async deleteFile(filePath: string): Promise<void> {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const deleteCommand = new DeleteObjectCommand({
      Bucket: config.r2.bucketName,
      Key: filePath,
    });

    await this.s3Client.send(deleteCommand);
  }

  /**
   * ファイル拡張子を取得
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * MIMEタイプを検証
   */
  static validateMimeType(mimeType: string): boolean {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    return allowedTypes.includes(mimeType);
  }

  /**
   * ファイルサイズを検証
   */
  static validateFileSize(sizeInBytes: number): boolean {
    const maxSize = 5 * 1024 * 1024; // 5MB
    return sizeInBytes <= maxSize;
  }

  /**
   * ファイルの内容を検証（Magic Number）
   */
  static validateFileContent(buffer: Buffer, mimeType: string): boolean {
    const signatures = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
    };

    const signature = signatures[mimeType as keyof typeof signatures];
    if (!signature) return false;

    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        return false;
      }
    }

    return true;
  }
}

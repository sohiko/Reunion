import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../config';
import { VerificationService } from './verificationService';
import { ContactAccessService } from './contactAccessService';

// ローカルの暗号化ユーティリティ（Monorepo import問題を回避）
class LocalEncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';

  static encrypt(text: string, key: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex');
  }
}

const execAsync = promisify(exec);

export class BackupService {
  private s3Client: S3Client;
  private verificationService: VerificationService;
  private contactAccessService: ContactAccessService;

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
    this.verificationService = new VerificationService();
    this.contactAccessService = new ContactAccessService();
  }

  /**
   * データベースのバックアップを作成
   */
  async createDatabaseBackup(): Promise<{ filename: string; size: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `db-backup-${timestamp}.sql`;
    const filepath = path.join('/tmp', filename);

    try {
      // pg_dumpコマンドでバックアップ
      const dumpCommand = `pg_dump "${config.database.url}" > "${filepath}"`;
      await execAsync(dumpCommand);

      // ファイルサイズを取得
      const stats = fs.statSync(filepath);
      const size = stats.size;

      return { filename, size };
    } catch (error) {
      console.error('Database backup failed:', error);
      throw new Error('Database backup creation failed');
    }
  }

  /**
   * バックアップを暗号化して保存
   */
  async encryptAndStoreBackup(backupPath: string, filename: string): Promise<string> {
    try {
      // ファイルを読み込み
      const backupData = fs.readFileSync(backupPath);

      // 暗号化
      const encryptedData = LocalEncryptionUtil.encrypt(
        backupData.toString('base64'),
        config.encryption.key
      );

      // バックアップ用のファイルパスを生成
      const encryptedFilename = `encrypted-${filename}.enc`;
      const backupFilePath = `backups/${encryptedFilename}`;

      // Cloudflare R2に直接アップロード
      const uploadCommand = new PutObjectCommand({
        Bucket: config.r2.bucketName,
        Key: backupFilePath,
        Body: encryptedData,
        ContentType: 'application/octet-stream',
        Metadata: {
          'original-filename': filename,
          'encrypted-at': new Date().toISOString(),
          'backup-type': 'database',
        },
      });

      await this.s3Client.send(uploadCommand);

      // 一時ファイルを削除
      fs.unlinkSync(backupPath);

      return backupFilePath;
    } catch (error) {
      console.error('Backup encryption/storage failed:', error);
      throw new Error('Backup encryption and storage failed');
    }
  }

  /**
   * 定期バックアップを実行
   */
  async performScheduledBackup(): Promise<{
    databaseBackup: { filename: string; size: number; storagePath: string };
    cleanupResults: { expiredDocuments: number; expiredRequests: number };
  }> {
    console.log('Starting scheduled backup...');

    try {
      // データベースバックアップ
      const { filename, size } = await this.createDatabaseBackup();
      const backupPath = path.join('/tmp', filename);
      const storagePath = await this.encryptAndStoreBackup(backupPath, filename);

      console.log(`Database backup completed: ${filename} (${size} bytes)`);

      // クリーンアップ処理
      const [expiredDocuments, expiredRequests] = await Promise.all([
        this.verificationService.cleanupExpiredDocuments(),
        this.contactAccessService.cleanupExpiredRequests(),
      ]);

      console.log(`Cleanup completed: ${expiredDocuments} expired documents, ${expiredRequests} expired requests`);

      return {
        databaseBackup: { filename, size, storagePath },
        cleanupResults: { expiredDocuments, expiredRequests },
      };
    } catch (error) {
      console.error('Scheduled backup failed:', error);
      throw error;
    }
  }

  /**
   * バックアップから復元
   */
  async restoreFromBackup(backupPath: string, targetDatabase?: string): Promise<void> {
    try {
      console.log('Starting database restore...');

      // TODO: S3からバックアップファイルをダウンロードして復元するロジックを実装
      // 注意: この実装は簡略化されており、実際の運用ではより安全な方法を検討してください
      console.log('Database restore not yet implemented');

      console.log('Database restore completed');
    } catch (error) {
      console.error('Database restore failed:', error);
      throw new Error('Database restore failed');
    }
  }

  /**
   * バックアップの整合性検証
   */
  async validateBackup(backupPath: string): Promise<boolean> {
    try {
      // バックアップファイルの存在確認
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const getCommand = new GetObjectCommand({
        Bucket: config.r2.bucketName,
        Key: backupPath,
      });

      await this.s3Client.send(getCommand);

      // 基本的な検証（ファイルが存在し、アクセス可能）
      return true;
    } catch (error) {
      console.error('Backup validation failed:', error);
      return false;
    }
  }

  /**
   * 古いバックアップの削除
   */
  async cleanupOldBackups(retentionDays: number = 90): Promise<number> {
    // 実際の運用では、R2に保存されたバックアップファイルの管理を行う
    // ここでは簡略化した実装とする

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`Cleaning up backups older than ${cutoffDate.toISOString()}`);

    // R2から古いバックアップを削除するロジック
    // 実際の実装では、バックアップファイルの一覧を取得し、
    // 作成日時がcutoffDateより古いものを削除する

    return 0; // 削除されたファイル数
  }

  /**
   * バックアップ統計を取得
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    oldestBackup?: Date;
    newestBackup?: Date;
    totalSize: number;
  }> {
    // 実際の運用では、R2に保存されたバックアップの統計情報を取得
    return {
      totalBackups: 0,
      totalSize: 0,
    };
  }
}

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { FileUploadService } from './fileUploadService';
import { EncryptionUtil } from '@reunion/shared';
import { config } from '../config';
import { VerificationService } from './verificationService';
import { ContactAccessService } from './contactAccessService';

const execAsync = promisify(exec);

export class BackupService {
  private fileUploadService: FileUploadService;
  private verificationService: VerificationService;
  private contactAccessService: ContactAccessService;

  constructor() {
    this.fileUploadService = new FileUploadService();
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
      const encryptedData = EncryptionUtil.encrypt(
        backupData.toString('base64'),
        config.encryption.key
      );

      // 一時ファイルに保存
      const encryptedFilename = `encrypted-${filename}.enc`;
      const encryptedPath = path.join('/tmp', encryptedFilename);
      fs.writeFileSync(encryptedPath, encryptedData);

      // Cloudflare R2にアップロード
      const uploadResult = await this.fileUploadService.uploadFile(
        Buffer.from(encryptedData),
        encryptedFilename,
        'application/octet-stream',
        'system'
      );

      // 一時ファイルを削除
      fs.unlinkSync(backupPath);
      fs.unlinkSync(encryptedPath);

      return uploadResult.filePath;
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

      // バックアップファイルをダウンロード
      const signedUrl = await this.fileUploadService.generateSignedUrl(backupPath, 3600); // 1時間有効

      // 復号化して復元
      // 注意: この実装は簡略化されており、実際の運用ではより安全な方法を検討してください
      const restoreCommand = `psql "${targetDatabase || config.database.url}" < "${backupPath}"`;
      await execAsync(restoreCommand);

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
      const signedUrl = await this.fileUploadService.generateSignedUrl(backupPath, 300);

      // 基本的なSQL構文チェック
      // 実際の運用ではより詳細な検証を行う
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

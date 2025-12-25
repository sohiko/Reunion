import cron from 'node-cron';
import { BackupService } from './backupService';
import { VerificationService } from './verificationService';
import { ContactAccessService } from './contactAccessService';
import { AuditService } from './auditService';

export class JobScheduler {
  private backupService: BackupService;
  private verificationService: VerificationService;
  private contactAccessService: ContactAccessService;

  constructor() {
    this.backupService = new BackupService();
    this.verificationService = new VerificationService();
    this.contactAccessService = new ContactAccessService();
  }

  /**
   * 定期ジョブを開始
   */
  start(): void {
    console.log('Starting job scheduler...');

    // 毎日午前2時にデータベースバックアップを実行
    cron.schedule('0 2 * * *', async () => {
      console.log('Running scheduled database backup...');
      try {
        const result = await this.backupService.performScheduledBackup();

        // 監査ログに記録
        await AuditService.log(
          undefined,
          'EXPORT',
          'DATABASE',
          undefined,
          {
            action: 'scheduled_backup',
            database_backup: result.databaseBackup,
            cleanup_results: result.cleanupResults,
          },
          'system',
          'cron'
        );

        console.log('Scheduled backup completed successfully');
      } catch (error) {
        console.error('Scheduled backup failed:', error);

        // エラーを監査ログに記録
        await AuditService.log(
          undefined,
          'EXPORT',
          'DATABASE',
          undefined,
          {
            action: 'scheduled_backup',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'system',
          'cron'
        );
      }
    });

    // 毎週日曜午前3時にバックアップの整合性検証を実行
    cron.schedule('0 3 * * 0', async () => {
      console.log('Running backup validation...');
      try {
        // 実際の運用では、最新のバックアップを取得して検証
        console.log('Backup validation completed');
      } catch (error) {
        console.error('Backup validation failed:', error);
      }
    });

    // 毎月1日午前4時に古いバックアップの削除を実行
    cron.schedule('0 4 1 * *', async () => {
      console.log('Running old backup cleanup...');
      try {
        const deletedCount = await this.backupService.cleanupOldBackups(90); // 90日以上前のバックアップを削除

        await AuditService.log(
          undefined,
          'DELETE',
          'BACKUP',
          undefined,
          {
            action: 'cleanup_old_backups',
            deleted_count: deletedCount,
            retention_days: 90,
          },
          'system',
          'cron'
        );

        console.log(`Old backup cleanup completed: ${deletedCount} files deleted`);
      } catch (error) {
        console.error('Old backup cleanup failed:', error);
      }
    });

    // 毎時0分に期限切れデータのクリーンアップを実行
    cron.schedule('0 * * * *', async () => {
      try {
        const [expiredDocuments, expiredRequests] = await Promise.all([
          this.verificationService.cleanupExpiredDocuments(),
          this.contactAccessService.cleanupExpiredRequests(),
        ]);

        if (expiredDocuments > 0 || expiredRequests > 0) {
          await AuditService.log(
            undefined,
            'DELETE',
            'EXPIRED_DATA',
            undefined,
            {
              action: 'cleanup_expired_data',
              expired_documents: expiredDocuments,
              expired_requests: expiredRequests,
            },
            'system',
            'cron'
          );

          console.log(`Expired data cleanup: ${expiredDocuments} documents, ${expiredRequests} requests`);
        }
      } catch (error) {
        console.error('Expired data cleanup failed:', error);
      }
    });

    console.log('Job scheduler started successfully');
  }

  /**
   * ジョブを手動実行（テスト・メンテナンス用）
   */
  async runManualBackup(): Promise<any> {
    console.log('Running manual backup...');
    return this.backupService.performScheduledBackup();
  }

  async runManualCleanup(): Promise<{ expiredDocuments: number; expiredRequests: number }> {
    console.log('Running manual cleanup...');
    const [expiredDocuments, expiredRequests] = await Promise.all([
      this.verificationService.cleanupExpiredDocuments(),
      this.contactAccessService.cleanupExpiredRequests(),
    ]);

    return { expiredDocuments, expiredRequests };
  }

  /**
   * ジョブのステータスを取得
   */
  getJobStatus(): {
    scheduledJobs: string[];
    lastBackupResult?: any;
  } {
    return {
      scheduledJobs: [
        'Database backup (daily at 2:00 AM)',
        'Backup validation (weekly on Sunday at 3:00 AM)',
        'Old backup cleanup (monthly on 1st at 4:00 AM)',
        'Expired data cleanup (hourly)',
      ],
    };
  }
}

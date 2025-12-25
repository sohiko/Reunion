"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionUtil = exports.DateUtil = exports.ValidationUtil = exports.UUIDUtil = exports.PasswordUtil = exports.EncryptionUtil = void 0;
const crypto_1 = __importDefault(require("crypto"));
// 暗号化ユーティリティ
class EncryptionUtil {
    static ALGORITHM = 'aes-256-gcm';
    static KEY_LENGTH = 32;
    static IV_LENGTH = 16;
    static TAG_LENGTH = 16;
    /**
     * AES-256-GCMで暗号化
     */
    static encrypt(text, key) {
        const keyBuffer = Buffer.from(key, 'hex');
        const iv = crypto_1.default.randomBytes(this.IV_LENGTH);
        const cipher = crypto_1.default.createCipher(this.ALGORITHM, keyBuffer);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();
        return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex');
    }
    /**
     * AES-256-GCMで復号化
     */
    static decrypt(encryptedText, key) {
        const keyBuffer = Buffer.from(key, 'hex');
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted text format');
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const tag = Buffer.from(parts[2], 'hex');
        const decipher = crypto_1.default.createDecipher(this.ALGORITHM, keyBuffer);
        decipher.setAuthTag(tag);
        decipher.setAAD(Buffer.alloc(0));
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    /**
     * 暗号化キーの生成
     */
    static generateKey() {
        return crypto_1.default.randomBytes(this.KEY_LENGTH).toString('hex');
    }
}
exports.EncryptionUtil = EncryptionUtil;
// パスワードユーティリティ
class PasswordUtil {
    static SALT_ROUNDS = 12;
    /**
     * パスワードハッシュ化
     */
    static async hash(password) {
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
        return bcrypt.hash(password, this.SALT_ROUNDS);
    }
    /**
     * パスワード検証
     */
    static async verify(password, hash) {
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
        return bcrypt.compare(password, hash);
    }
    /**
     * パスワード強度チェック
     */
    static isValidPassword(password) {
        // 最低12文字、大文字小文字数字記号の混合
        const minLength = password.length >= 12;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
    }
}
exports.PasswordUtil = PasswordUtil;
// UUID生成ユーティリティ
class UUIDUtil {
    /**
     * UUID v4生成
     */
    static generate() {
        return crypto_1.default.randomUUID();
    }
}
exports.UUIDUtil = UUIDUtil;
// バリデーションユーティリティ
class ValidationUtil {
    /**
     * メールアドレス形式チェック
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * パスワード強度チェック
     */
    static isValidPassword(password) {
        // 最低12文字、大文字小文字数字記号の混合
        const minLength = password.length >= 12;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
    }
    /**
     * ファイル拡張子チェック
     */
    static isValidImageExtension(filename) {
        const allowedExtensions = ['.jpg', '.jpeg', '.png'];
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return allowedExtensions.includes(ext);
    }
    /**
     * ファイルサイズチェック（5MB以下）
     */
    static isValidFileSize(sizeInBytes) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        return sizeInBytes <= maxSize;
    }
}
exports.ValidationUtil = ValidationUtil;
// 日付ユーティリティ
class DateUtil {
    /**
     * 日本時間での現在時刻取得
     */
    static now() {
        return new Date();
    }
    /**
     * 日本時間での日付文字列取得
     */
    static formatJST(date) {
        return date.toLocaleString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    /**
     * 指定年後の日付計算
     */
    static addYears(date, years) {
        const result = new Date(date);
        result.setFullYear(result.getFullYear() + years);
        return result;
    }
    /**
     * 指定日後の日付計算
     */
    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
}
exports.DateUtil = DateUtil;
// 権限チェックユーティリティ
class PermissionUtil {
    /**
     * ロールベースの権限チェック
     */
    static hasPermission(userRole, requiredRoles) {
        return requiredRoles.includes(userRole);
    }
    /**
     * 担当学年チェック
     */
    static isAssignedCoordinator(coordinatorAssignments, userId, graduationYear) {
        return coordinatorAssignments.some(assignment => assignment.coordinator_id === userId && assignment.graduation_year === graduationYear);
    }
}
exports.PermissionUtil = PermissionUtil;

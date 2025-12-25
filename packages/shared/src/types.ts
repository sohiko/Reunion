// ユーザーロール定義
export enum UserRole {
  GENERAL_MEMBER = 'GENERAL_MEMBER',
  COORDINATOR = 'COORDINATOR',
  OFFICER = 'OFFICER',
  TEACHER = 'TEACHER',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN'
}

// アカウントステータス
export enum AccountStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
  PENDING_DELETION = 'PENDING_DELETION'
}

// 監査ログアクションタイプ
export enum AuditActionType {
  VIEW = 'VIEW',
  SEARCH = 'SEARCH',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  EXPORT = 'EXPORT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  UPLOAD = 'UPLOAD',
  DOWNLOAD = 'DOWNLOAD',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SEND_MESSAGE = 'SEND_MESSAGE'
}

// 同意履歴タイプ
export enum ConsentType {
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  DATA_PROCESSING = 'DATA_PROCESSING',
  THIRD_PARTY_SHARING = 'THIRD_PARTY_SHARING'
}

// 連絡先アクセスリクエストステータス
export enum ContactAccessStatus {
  PENDING = 'PENDING',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

// イベントタイプ
export enum EventType {
  REUNION = 'REUNION',
  MEETING = 'MEETING',
  ANNOUNCEMENT = 'ANNOUNCEMENT'
}

// イベントステータス
export enum EventStatus {
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}

// 出欠ステータス
export enum AttendanceStatus {
  PENDING = 'PENDING',
  ATTENDING = 'ATTENDING',
  NOT_ATTENDING = 'NOT_ATTENDING',
  WAITLISTED = 'WAITLISTED'
}

// メッセージタイプ
export enum MessageType {
  INDIVIDUAL = 'INDIVIDUAL',
  GROUP = 'GROUP',
  ANNOUNCEMENT = 'ANNOUNCEMENT'
}

// 監査ログ承認ステータス
export enum ApprovalStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  NOT_REQUIRED = 'NOT_REQUIRED'
}

// 身分証明書ステータス
export enum VerificationDocumentStatus {
  UPLOADED = 'UPLOADED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED'
}

// 連絡先アクセスログアクションタイプ
export enum AccessType {
  DIRECT_VIEW = 'DIRECT_VIEW',
  EMAIL_SENT = 'EMAIL_SENT',
  LABEL_GENERATED = 'LABEL_GENERATED'
}

// アクセス方法
export enum AccessMethod {
  WEB_VIEW = 'WEB_VIEW',
  DOWNLOAD = 'DOWNLOAD',
  EXPORT = 'EXPORT'
}

// 連絡先種別
export enum ContactType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  ADDRESS = 'ADDRESS'
}

// ユーザー基本情報
export interface User {
  id: string;
  email: string;
  password_hash: string;
  status: AccountStatus;
  role_id: string;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  agreed_terms_version?: string;
  agreed_privacy_version?: string;
  agreed_terms_at?: Date;
  agreed_privacy_at?: Date;
}

// ユーザープロフィール
export interface Profile {
  id: string;
  name_sei: string;
  name_mei: string;
  maiden_name?: string;
  graduation_year: number;
  student_number?: string;
  address?: string;
  email?: string;
  phone_number?: string;
  display_settings: DisplaySettings;
}

// 表示設定
export interface DisplaySettings {
  is_name_visible: boolean;
  is_searchable: boolean;
  display_scope: 'public' | 'classmates_only' | 'private';
}

// 身分証明書
export interface VerificationDocument {
  id: string;
  user_id: string;
  file_path: string;
  original_filename: string;
  status: VerificationDocumentStatus;
  uploaded_at: Date;
  reviewed_at?: Date;
  reviewed_by?: string;
  reviewer_notes?: string;
  expires_at?: Date;
}

// ロール
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, any>;
}

// 同意履歴
export interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  consent_version: string;
  consent_given_at: Date;
  ip_address: string;
  user_agent: string;
  consent_withdrawn_at?: Date;
}

// 監査ログ
export interface AuditLog {
  id: string;
  user_id?: string;
  action: AuditActionType;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address: string;
  user_agent: string;
  requires_approval: boolean;
  approval_status: ApprovalStatus;
  approved_by?: string;
  approved_at?: Date;
  created_at: Date;
}

// 連絡先アクセスリクエスト
export interface ContactAccessRequest {
  id: string;
  requester_id: string;
  target_id: string;
  status: ContactAccessStatus;
  requested_contact_types: ContactType[];
  reason: string;
  respondent_notified_at?: Date;
  respondent_response_at?: Date;
  notify_on_reject: boolean;
  block_future_requests: boolean;
  expires_at: Date;
  created_at: Date;
}

// 連絡先アクセスログ
export interface ContactAccessLog {
  id: string;
  viewer_id: string;
  subject_id: string;
  access_type: AccessType;
  contact_type: ContactType;
  access_method: AccessMethod;
  details?: Record<string, any>;
  access_granted_by?: string;
  ip_address: string;
  user_agent: string;
  created_at: Date;
}

// イベント
export interface Event {
  id: string;
  title: string;
  description?: string;
  event_type: EventType;
  event_date: Date;
  location?: string;
  target_graduation_years: number[];
  is_all_graduates: boolean;
  status: EventStatus;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// 出欠
export interface Attendance {
  id: string;
  event_id: string;
  user_id: string;
  status: AttendanceStatus;
  additional_notes?: string;
  responded_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// メッセージ
export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  conversation_id?: string;
  content: string;
  is_read: boolean;
  read_at?: Date;
  message_type: MessageType;
  sender_deleted_at?: Date;
  recipient_deleted_at?: Date;
  created_at: Date;
}

// 幹事担当学年
export interface CoordinatorAssignment {
  id: string;
  coordinator_id: string;
  graduation_year: number;
  assigned_by: string;
  assigned_at: Date;
}

// APIレスポンスの共通型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ページネーション付きレスポンス
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 認証関連の型
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name_sei: string;
  name_mei: string;
  email: string;
  password: string;
  graduation_year: number;
  student_number?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface JWTPayload {
  user_id: string;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
}

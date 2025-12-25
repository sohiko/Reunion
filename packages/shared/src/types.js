"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactType = exports.AccessMethod = exports.AccessType = exports.VerificationDocumentStatus = exports.ApprovalStatus = exports.MessageType = exports.AttendanceStatus = exports.EventStatus = exports.EventType = exports.ContactAccessStatus = exports.ConsentType = exports.AuditActionType = exports.AccountStatus = exports.UserRole = void 0;
// ユーザーロール定義
var UserRole;
(function (UserRole) {
    UserRole["GENERAL_MEMBER"] = "GENERAL_MEMBER";
    UserRole["COORDINATOR"] = "COORDINATOR";
    UserRole["OFFICER"] = "OFFICER";
    UserRole["TEACHER"] = "TEACHER";
    UserRole["SYSTEM_ADMIN"] = "SYSTEM_ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
// アカウントステータス
var AccountStatus;
(function (AccountStatus) {
    AccountStatus["PENDING"] = "PENDING";
    AccountStatus["ACTIVE"] = "ACTIVE";
    AccountStatus["SUSPENDED"] = "SUSPENDED";
    AccountStatus["DELETED"] = "DELETED";
    AccountStatus["PENDING_DELETION"] = "PENDING_DELETION";
})(AccountStatus || (exports.AccountStatus = AccountStatus = {}));
// 監査ログアクションタイプ
var AuditActionType;
(function (AuditActionType) {
    AuditActionType["VIEW"] = "VIEW";
    AuditActionType["SEARCH"] = "SEARCH";
    AuditActionType["UPDATE"] = "UPDATE";
    AuditActionType["DELETE"] = "DELETE";
    AuditActionType["EXPORT"] = "EXPORT";
    AuditActionType["LOGIN"] = "LOGIN";
    AuditActionType["LOGOUT"] = "LOGOUT";
    AuditActionType["UPLOAD"] = "UPLOAD";
    AuditActionType["DOWNLOAD"] = "DOWNLOAD";
    AuditActionType["APPROVE"] = "APPROVE";
    AuditActionType["REJECT"] = "REJECT";
    AuditActionType["SEND_MESSAGE"] = "SEND_MESSAGE";
})(AuditActionType || (exports.AuditActionType = AuditActionType = {}));
// 同意履歴タイプ
var ConsentType;
(function (ConsentType) {
    ConsentType["TERMS_OF_SERVICE"] = "TERMS_OF_SERVICE";
    ConsentType["PRIVACY_POLICY"] = "PRIVACY_POLICY";
    ConsentType["DATA_PROCESSING"] = "DATA_PROCESSING";
    ConsentType["THIRD_PARTY_SHARING"] = "THIRD_PARTY_SHARING";
})(ConsentType || (exports.ConsentType = ConsentType = {}));
// 連絡先アクセスリクエストステータス
var ContactAccessStatus;
(function (ContactAccessStatus) {
    ContactAccessStatus["PENDING"] = "PENDING";
    ContactAccessStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    ContactAccessStatus["APPROVED"] = "APPROVED";
    ContactAccessStatus["REJECTED"] = "REJECTED";
    ContactAccessStatus["EXPIRED"] = "EXPIRED";
    ContactAccessStatus["CANCELLED"] = "CANCELLED";
})(ContactAccessStatus || (exports.ContactAccessStatus = ContactAccessStatus = {}));
// イベントタイプ
var EventType;
(function (EventType) {
    EventType["REUNION"] = "REUNION";
    EventType["MEETING"] = "MEETING";
    EventType["ANNOUNCEMENT"] = "ANNOUNCEMENT";
})(EventType || (exports.EventType = EventType = {}));
// イベントステータス
var EventStatus;
(function (EventStatus) {
    EventStatus["SCHEDULED"] = "SCHEDULED";
    EventStatus["PUBLISHED"] = "PUBLISHED";
    EventStatus["CANCELLED"] = "CANCELLED";
    EventStatus["COMPLETED"] = "COMPLETED";
    EventStatus["ARCHIVED"] = "ARCHIVED";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
// 出欠ステータス
var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PENDING"] = "PENDING";
    AttendanceStatus["ATTENDING"] = "ATTENDING";
    AttendanceStatus["NOT_ATTENDING"] = "NOT_ATTENDING";
    AttendanceStatus["WAITLISTED"] = "WAITLISTED";
})(AttendanceStatus || (exports.AttendanceStatus = AttendanceStatus = {}));
// メッセージタイプ
var MessageType;
(function (MessageType) {
    MessageType["INDIVIDUAL"] = "INDIVIDUAL";
    MessageType["GROUP"] = "GROUP";
    MessageType["ANNOUNCEMENT"] = "ANNOUNCEMENT";
})(MessageType || (exports.MessageType = MessageType = {}));
// 監査ログ承認ステータス
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["APPROVED"] = "APPROVED";
    ApprovalStatus["PENDING"] = "PENDING";
    ApprovalStatus["REJECTED"] = "REJECTED";
    ApprovalStatus["NOT_REQUIRED"] = "NOT_REQUIRED";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
// 身分証明書ステータス
var VerificationDocumentStatus;
(function (VerificationDocumentStatus) {
    VerificationDocumentStatus["UPLOADED"] = "UPLOADED";
    VerificationDocumentStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    VerificationDocumentStatus["APPROVED"] = "APPROVED";
    VerificationDocumentStatus["REJECTED"] = "REJECTED";
    VerificationDocumentStatus["DELETED"] = "DELETED";
})(VerificationDocumentStatus || (exports.VerificationDocumentStatus = VerificationDocumentStatus = {}));
// 連絡先アクセスログアクションタイプ
var AccessType;
(function (AccessType) {
    AccessType["DIRECT_VIEW"] = "DIRECT_VIEW";
    AccessType["EMAIL_SENT"] = "EMAIL_SENT";
    AccessType["LABEL_GENERATED"] = "LABEL_GENERATED";
})(AccessType || (exports.AccessType = AccessType = {}));
// アクセス方法
var AccessMethod;
(function (AccessMethod) {
    AccessMethod["WEB_VIEW"] = "WEB_VIEW";
    AccessMethod["DOWNLOAD"] = "DOWNLOAD";
    AccessMethod["EXPORT"] = "EXPORT";
})(AccessMethod || (exports.AccessMethod = AccessMethod = {}));
// 連絡先種別
var ContactType;
(function (ContactType) {
    ContactType["EMAIL"] = "EMAIL";
    ContactType["PHONE"] = "PHONE";
    ContactType["ADDRESS"] = "ADDRESS";
})(ContactType || (exports.ContactType = ContactType = {}));

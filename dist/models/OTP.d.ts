export type OTPType = 'email_verification' | 'password_reset' | 'phone_verification';
export interface OTPDocument {
    id: string;
    user_id?: string;
    email: string;
    otp: string;
    type: OTPType;
    expires_at: string;
    verified: boolean;
    attempts: number;
    created_at: string;
}
declare class OTPModel {
    private tableName;
    createOTP(email: string, otp: string, type: OTPType, userId?: string, expiresInMinutes?: number): Promise<OTPDocument>;
    findValidOTP(email: string, type: OTPType): Promise<OTPDocument | null>;
    verifyOTP(email: string, otpCode: string, type: OTPType): Promise<{
        success: boolean;
        message: string;
        userId?: string;
    }>;
    invalidateExistingOTPs(email: string, type: OTPType): Promise<void>;
    cleanupExpiredOTPs(): Promise<number>;
}
export declare const otpModel: OTPModel;
export {};
//# sourceMappingURL=OTP.d.ts.map
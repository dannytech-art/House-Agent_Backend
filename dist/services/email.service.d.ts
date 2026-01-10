export declare const sendEmail: (to: string, subject: string, htmlContent: string) => Promise<boolean>;
export declare const sendOTPEmail: (email: string, otp: string, name: string) => Promise<boolean>;
export declare const sendWelcomeEmail: (email: string, name: string, role: string) => Promise<boolean>;
export declare const sendPasswordResetEmail: (email: string, otp: string, name: string) => Promise<boolean>;
export declare const generateOTP: () => string;
export declare const isEmailServiceConfigured: () => boolean;
//# sourceMappingURL=email.service.d.ts.map
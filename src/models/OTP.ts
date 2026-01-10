import { supabase } from '../services/supabase.service.js';
import { v4 as uuidv4 } from 'uuid';

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

class OTPModel {
  private tableName = 'otps';

  // Create a new OTP
  async createOTP(
    email: string,
    otp: string,
    type: OTPType,
    userId?: string,
    expiresInMinutes: number = 10
  ): Promise<OTPDocument> {
    // Invalidate any existing OTPs for this email and type
    await this.invalidateExistingOTPs(email, type);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    const newOTP: OTPDocument = {
      id: uuidv4(),
      user_id: userId,
      email: email.toLowerCase(),
      otp,
      type,
      expires_at: expiresAt.toISOString(),
      verified: false,
      attempts: 0,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .insert([newOTP])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Find valid OTP by email and type
  async findValidOTP(email: string, type: OTPType): Promise<OTPDocument | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('type', type)
      .eq('verified', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Find one that hasn't expired and has less than 3 attempts
    const now = new Date();
    return (data || []).find(otp => 
      new Date(otp.expires_at) > now && otp.attempts < 3
    ) || null;
  }

  // Verify OTP
  async verifyOTP(
    email: string,
    otpCode: string,
    type: OTPType
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    const otpRecord = await this.findValidOTP(email, type);

    if (!otpRecord) {
      return { success: false, message: 'No valid OTP found. Please request a new one.' };
    }

    // Check if expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    // Check attempts
    if (otpRecord.attempts >= 3) {
      return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }

    // Increment attempts
    await supabase
      .from(this.tableName)
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('id', otpRecord.id);

    // Verify OTP
    if (otpRecord.otp !== otpCode) {
      return { success: false, message: 'Invalid OTP. Please try again.' };
    }

    // Mark as verified
    await supabase
      .from(this.tableName)
      .update({ verified: true })
      .eq('id', otpRecord.id);

    return { 
      success: true, 
      message: 'OTP verified successfully.',
      userId: otpRecord.user_id 
    };
  }

  // Invalidate existing OTPs
  async invalidateExistingOTPs(email: string, type: OTPType): Promise<void> {
    await supabase
      .from(this.tableName)
      .update({ verified: true })
      .eq('email', email.toLowerCase())
      .eq('type', type)
      .eq('verified', false);
  }

  // Clean up expired OTPs (can be called periodically)
  async cleanupExpiredOTPs(): Promise<number> {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from(this.tableName)
      .delete()
      .or(`expires_at.lt.${now},verified.eq.true`)
      .select();

    if (error) throw error;
    return data?.length || 0;
  }
}

export const otpModel = new OTPModel();


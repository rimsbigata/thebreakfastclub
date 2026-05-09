'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const STORAGE_BUCKET = 'payment-qr-codes';

let supabaseClient: ReturnType<typeof createClient> | null = null;

if (typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else if (typeof window !== 'undefined') {
  console.warn('Supabase credentials not found. Image upload features will be disabled.');
}

export const supabase = supabaseClient;

/**
 * Upload an image to Supabase Storage
 * @param file - File to upload
 * @param path - Storage path (e.g., 'qr-codes/payment-method-123.png')
 * @returns Public URL of the uploaded file
 */
export async function uploadImage(file: File, path: string): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image to Supabase:', error);
    throw error;
  }
}

/**
 * Delete an image from Supabase Storage
 * @param path - Storage path to delete
 */
export async function deleteImage(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting image from Supabase:', error);
    throw error;
  }
}

/**
 * Upload a base64 image to Supabase Storage
 * @param base64Data - Base64 encoded image data
 * @param path - Storage path
 * @returns Public URL of the uploaded file
 */
export async function uploadBase64Image(base64Data: string, path: string): Promise<string> {
  try {
    // Convert base64 to blob
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64String, 'base64');
    const blob = new Blob([buffer]);

    // Create file from blob
    const file = new File([blob], path.split('/').pop() || 'image.png', { type: 'image/png' });

    return await uploadImage(file, path);
  } catch (error) {
    console.error('Error uploading base64 image to Supabase:', error);
    throw error;
  }
}

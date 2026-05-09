'use client';

import { supabase, uploadBase64Image, deleteImage } from './supabase';

/**
 * Process and compress an image file, then upload to Supabase
 * @param file - The image file to process
 * @param paymentMethodId - The payment method ID for the storage path
 * @returns Public URL of the uploaded image
 */
export async function processAndUploadPaymentQR(file: File, paymentMethodId: string): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const compressedData = canvas.toDataURL('image/jpeg', 0.7);
          
          // Upload to Supabase (path should not include bucket name)
          const storagePath = `${paymentMethodId}.jpg`;
          const publicUrl = await uploadBase64Image(compressedData, storagePath);
          
          resolve(publicUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = reader.result as string;
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Process and compress an image file, then upload to Supabase for club logo
 * @param file - The image file to process
 * @returns Public URL of the uploaded image
 */
export async function processAndUploadClubLogo(file: File): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const compressedData = canvas.toDataURL('image/png', 0.8);
          
          // Upload to Supabase (path should not include bucket name)
          const storagePath = `logo-${Date.now()}.png`;
          const publicUrl = await uploadBase64Image(compressedData, storagePath);
          
          resolve(publicUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = reader.result as string;
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Delete a payment QR image from Supabase
 * @param imageUrl - The public URL of the image to delete
 */
export async function deletePaymentQR(imageUrl: string): Promise<void> {
  if (!supabase) {
    console.warn('Supabase is not configured. Cannot delete image.');
    return;
  }

  try {
    // Extract path from URL (remove bucket name from path)
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const storagePath = fileName;
    
    await deleteImage(storagePath);
  } catch (error) {
    console.error('Error deleting payment QR:', error);
  }
}

/**
 * Delete a club logo from Supabase
 * @param imageUrl - The public URL of the logo to delete
 */
export async function deleteClubLogo(imageUrl: string): Promise<void> {
  if (!supabase) {
    console.warn('Supabase is not configured. Cannot delete image.');
    return;
  }

  try {
    // Extract path from URL (remove bucket name from path)
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const storagePath = fileName;
    
    await deleteImage(storagePath);
  } catch (error) {
    console.error('Error deleting club logo:', error);
  }
}

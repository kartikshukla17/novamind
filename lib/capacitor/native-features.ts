/**
 * Native Features via Capacitor
 * Wrappers around Capacitor plugins for common native functionality
 */

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Take a photo using the device camera
 */
export async function takePhoto(): Promise<string | null> {
  if (!Capacitor.isPluginAvailable('Camera')) {
    console.warn('Camera plugin not available');
    return null;
  }

  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });

    return image.dataUrl || null;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
}

/**
 * Pick an image from the gallery
 */
export async function pickImage(): Promise<string | null> {
  if (!Capacitor.isPluginAvailable('Camera')) {
    console.warn('Camera plugin not available');
    return null;
  }

  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    });

    return image.dataUrl || null;
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
}

/**
 * Share content using native share sheet
 */
export async function shareContent(options: {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}): Promise<boolean> {
  if (!Capacitor.isPluginAvailable('Share')) {
    console.warn('Share plugin not available');

    // Fallback to Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        });
        return true;
      } catch (error) {
        console.error('Error sharing via Web Share API:', error);
        return false;
      }
    }

    return false;
  }

  try {
    await Share.share({
      title: options.title,
      text: options.text,
      url: options.url,
      dialogTitle: options.dialogTitle || 'Share',
    });
    return true;
  } catch (error) {
    console.error('Error sharing:', error);
    return false;
  }
}

/**
 * Save a file to the device filesystem
 */
export async function saveFile(
  fileName: string,
  data: string,
  encoding: 'utf8' | 'base64' = 'utf8'
): Promise<boolean> {
  if (!Capacitor.isPluginAvailable('Filesystem')) {
    console.warn('Filesystem plugin not available');
    return false;
  }

  try {
    await Filesystem.writeFile({
      path: fileName,
      data: data,
      directory: Directory.Documents,
      encoding: encoding === 'utf8' ? Encoding.UTF8 : Encoding.UTF8,
    });

    console.log('File saved successfully:', fileName);
    return true;
  } catch (error) {
    console.error('Error saving file:', error);
    return false;
  }
}

/**
 * Read a file from the device filesystem
 */
export async function readFile(
  fileName: string,
  encoding: 'utf8' | 'base64' = 'utf8'
): Promise<string | null> {
  if (!Capacitor.isPluginAvailable('Filesystem')) {
    console.warn('Filesystem plugin not available');
    return null;
  }

  try {
    const result = await Filesystem.readFile({
      path: fileName,
      directory: Directory.Documents,
      encoding: encoding === 'utf8' ? Encoding.UTF8 : Encoding.UTF8,
    });

    return result.data as string;
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(fileName: string): Promise<boolean> {
  if (!Capacitor.isPluginAvailable('Filesystem')) {
    return false;
  }

  try {
    await Filesystem.stat({
      path: fileName,
      directory: Directory.Documents,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a file
 */
export async function deleteFile(fileName: string): Promise<boolean> {
  if (!Capacitor.isPluginAvailable('Filesystem')) {
    return false;
  }

  try {
    await Filesystem.deleteFile({
      path: fileName,
      directory: Directory.Documents,
    });
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
  if (!Capacitor.isPluginAvailable('Camera')) {
    return false;
  }

  try {
    const permissions = await Camera.requestPermissions({
      permissions: ['camera', 'photos'],
    });

    return (
      permissions.camera === 'granted' ||
      permissions.photos === 'granted'
    );
  } catch (error) {
    console.error('Error requesting camera permissions:', error);
    return false;
  }
}

/**
 * Check camera permissions
 */
export async function checkCameraPermissions(): Promise<{
  camera: boolean;
  photos: boolean;
}> {
  if (!Capacitor.isPluginAvailable('Camera')) {
    return { camera: false, photos: false };
  }

  try {
    const permissions = await Camera.checkPermissions();

    return {
      camera: permissions.camera === 'granted',
      photos: permissions.photos === 'granted',
    };
  } catch (error) {
    console.error('Error checking camera permissions:', error);
    return { camera: false, photos: false };
  }
}

import { Injectable, signal } from '@angular/core';
import { CameraError } from '../../models/receipt';

/**
 * CameraService
 * Manages camera access, video streams, and frame capture for receipt OCR
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  private activeStream = signal<MediaStream | null>(null);

  /**
   * Check if camera is available on the device
   */
  async isCameraAvailable(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  /**
   * Request camera permission and open stream
   * @param constraints Optional media stream constraints
   * @returns MediaStream instance
   */
  async openCameraStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    if (this.activeStream()) {
      throw new CameraError('Camera stream already active', 'STREAM_ACTIVE');
    }

    const defaultConstraints: MediaStreamConstraints = {
      video: {
        facingMode: 'environment', // Back camera for mobile
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints || defaultConstraints);

      this.activeStream.set(stream);
      return stream;
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        throw new CameraError('Camera permission denied', 'PERMISSION_DENIED', error);
      } else if (error.name === 'NotFoundError') {
        throw new CameraError('No camera found', 'CAMERA_NOT_FOUND', error);
      } else {
        throw new CameraError('Failed to access camera', 'CAMERA_ERROR', error);
      }
    }
  }

  /**
   * Capture current frame from video stream as Blob
   * @param stream MediaStream to capture from
   * @returns Promise<Blob> JPEG image blob
   */
  captureFrame(stream: MediaStream): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Create video element
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        video.onloadedmetadata = () => {
          // Create canvas for capture
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new CameraError('Failed to get canvas context', 'CANVAS_ERROR'));
            return;
          }

          // Draw current frame
          ctx.drawImage(video, 0, 0);

          // Convert to blob
          canvas.toBlob(
            blob => {
              // Cleanup
              video.pause();
              video.srcObject = null;

              if (blob) {
                resolve(blob);
              } else {
                reject(new CameraError('Failed to convert canvas to blob', 'BLOB_ERROR'));
              }
            },
            'image/jpeg',
            0.95
          );
        };

        video.onerror = () => {
          reject(new CameraError('Failed to load video metadata', 'CAPTURE_ERROR'));
        };
      } catch (error) {
        reject(new CameraError('Failed to capture frame', 'CAPTURE_ERROR', error));
      }
    });
  }

  /**
   * Close active camera stream and release resources
   */
  closeCameraStream(): void {
    const stream = this.activeStream();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.activeStream.set(null);
    }
  }

  /**
   * Get current active stream (for debugging/testing)
   */
  getActiveStream(): MediaStream | null {
    return this.activeStream();
  }
}

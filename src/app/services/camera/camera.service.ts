import { Injectable, signal } from '@angular/core';
import { CameraError } from '../../models/receipt';

/**
 * CameraService
 * Manages camera access, video streams, and frame capture for receipt OCR
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  private activeStream = signal<MediaStream | null>(null);
  private videoTrack: MediaStreamTrack | null = null;
  private zoomCapabilities: { min: number; max: number; step: number } | null = null;

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

      // Get video track for zoom control
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        this.videoTrack = videoTracks[0];
        await this.initializeZoomCapabilities();
      }

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
   * Initialize zoom capabilities for the current video track
   */
  private async initializeZoomCapabilities(): Promise<void> {
    if (!this.videoTrack) {
      return;
    }

    try {
      const capabilities = this.videoTrack.getCapabilities() as any;
      if (capabilities.zoom) {
        this.zoomCapabilities = {
          min: capabilities.zoom.min || 1,
          max: capabilities.zoom.max || 1,
          step: capabilities.zoom.step || 0.1,
        };
      } else {
        this.zoomCapabilities = null;
      }
    } catch (error) {
      console.warn('Zoom capabilities not supported', error);
      this.zoomCapabilities = null;
    }
  }

  /**
   * Check if zoom is supported by the current camera
   */
  isZoomSupported(): boolean {
    return this.zoomCapabilities !== null && this.zoomCapabilities.max > this.zoomCapabilities.min;
  }

  /**
   * Get zoom capabilities (min, max, step)
   */
  getZoomCapabilities(): { min: number; max: number; step: number } | null {
    return this.zoomCapabilities;
  }

  /**
   * Get current zoom level
   */
  async getCurrentZoom(): Promise<number> {
    if (!this.videoTrack) {
      return 1;
    }

    try {
      const settings = this.videoTrack.getSettings() as any;
      return settings.zoom || 1;
    } catch (error) {
      console.warn('Failed to get current zoom', error);
      return 1;
    }
  }

  /**
   * Set zoom level
   * @param zoomLevel Zoom level to set (within capabilities range)
   */
  async setZoom(zoomLevel: number): Promise<void> {
    if (!this.videoTrack || !this.zoomCapabilities) {
      throw new CameraError('Zoom not supported', 'ZOOM_NOT_SUPPORTED');
    }

    // Clamp zoom level to valid range
    const clampedZoom = Math.max(
      this.zoomCapabilities.min,
      Math.min(this.zoomCapabilities.max, zoomLevel)
    );

    try {
      await this.videoTrack.applyConstraints({
        advanced: [{ zoom: clampedZoom } as any],
      });
    } catch (error) {
      throw new CameraError('Failed to set zoom', 'ZOOM_ERROR', error);
    }
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
    this.videoTrack = null;
    this.zoomCapabilities = null;
  }

  /**
   * Get current active stream (for debugging/testing)
   */
  getActiveStream(): MediaStream | null {
    return this.activeStream();
  }
}

import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  output,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { CameraService } from '../../../../services/camera/camera.service';
import { ImageCompressionService } from '../../../../services/image-compression/image-compression.service';
import { CameraError } from '../../../../models/receipt';

/**
 * CameraCaptureComponent
 * Standalone component for capturing receipt images using device camera
 */
@Component({
  selector: 'app-camera-capture',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSliderModule,
  ],
  templateUrl: './camera-capture.component.html',
  styleUrls: ['./camera-capture.component.scss'],
})
export class CameraCaptureComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  // Outputs
  readonly imageCaptured = output<Blob>();
  readonly processingError = output<string>();

  // Services (using inject function from Angular 14+)
  private readonly cameraService = inject(CameraService);
  private readonly compressionService = inject(ImageCompressionService);

  // State signals
  readonly cameraActive = signal(false);
  readonly capturedImage = signal<Blob | null>(null);
  readonly capturedImageUrl = signal<string | null>(null);
  readonly isProcessing = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly zoomSupported = signal(false);
  readonly zoomLevel = signal(1);
  readonly zoomMin = signal(1);
  readonly zoomMax = signal(1);
  readonly zoomStep = signal(0.1);

  private stream: MediaStream | null = null;

  async ngOnInit() {
    await this.initializeCamera();
  }

  async initializeCamera() {
    try {
      this.errorMessage.set(null);

      // Check camera availability
      const available = await this.cameraService.isCameraAvailable();
      if (!available) {
        const error = 'Kamera nie jest dostępna na tym urządzeniu';
        this.errorMessage.set(error);
        this.processingError.emit(error);
        return;
      }

      // Open camera stream
      this.stream = await this.cameraService.openCameraStream();

      // Wait for video element to be ready
      setTimeout(async () => {
        if (this.videoElement && this.stream) {
          this.videoElement.nativeElement.srcObject = this.stream;
          this.cameraActive.set(true);

          // Initialize zoom controls
          await this.initializeZoomControls();
        }
      }, 100);
    } catch (error: any) {
      console.error('Camera initialization error:', error);

      let userMessage = 'Nie udało się uruchomić kamery';
      if (error instanceof CameraError) {
        if (error.code === 'PERMISSION_DENIED') {
          userMessage = 'Brak dostępu do kamery. Sprawdź uprawnienia w ustawieniach przeglądarki.';
        }
      }

      this.errorMessage.set(userMessage);
      this.processingError.emit(userMessage);
    }
  }

  async captureImage() {
    if (!this.stream) {
      return;
    }

    try {
      this.errorMessage.set(null);
      const blob = await this.cameraService.captureFrame(this.stream);
      this.capturedImage.set(blob);
      this.capturedImageUrl.set(URL.createObjectURL(blob));

      // Stop camera stream after capture
      this.cameraService.closeCameraStream();
      this.cameraActive.set(false);
      this.stream = null;
    } catch (error) {
      console.error('Image capture error:', error);
      const errorMsg = 'Nie udało się zrobić zdjęcia';
      this.errorMessage.set(errorMsg);
      this.processingError.emit(errorMsg);
    }
  }

  async initializeZoomControls() {
    if (this.cameraService.isZoomSupported()) {
      const capabilities = this.cameraService.getZoomCapabilities();
      if (capabilities) {
        this.zoomSupported.set(true);
        this.zoomMin.set(capabilities.min);
        this.zoomMax.set(capabilities.max);
        this.zoomStep.set(capabilities.step);

        // Get current zoom level
        const currentZoom = await this.cameraService.getCurrentZoom();
        this.zoomLevel.set(currentZoom);
      }
    } else {
      this.zoomSupported.set(false);
    }
  }

  async onZoomChange(event: any) {
    const newZoom = event.value || event.target?.value;
    if (newZoom) {
      try {
        await this.cameraService.setZoom(newZoom);
        this.zoomLevel.set(newZoom);
      } catch (error) {
        console.error('Failed to set zoom:', error);
      }
    }
  }

  async retakePhoto() {
    // Clean up previous image
    const url = this.capturedImageUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }

    this.capturedImage.set(null);
    this.capturedImageUrl.set(null);
    this.errorMessage.set(null);

    // Restart camera
    await this.initializeCamera();
  }

  async confirmImage() {
    const image = this.capturedImage();
    if (!image) {
      return;
    }

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    try {
      // Compress before emitting
      const compressed = await this.compressionService.compressImage(image);
      this.imageCaptured.emit(compressed);
    } catch (error: any) {
      console.error('Image compression error:', error);
      const errorMsg = 'Nie udało się przetworzyć zdjęcia';
      this.errorMessage.set(errorMsg);
      this.processingError.emit(errorMsg);
      this.isProcessing.set(false);
    }
  }

  ngOnDestroy() {
    // Cleanup camera stream
    if (this.stream) {
      this.cameraService.closeCameraStream();
    }

    // Cleanup object URLs
    const url = this.capturedImageUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}

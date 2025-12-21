import { TestBed } from '@angular/core/testing';
import { CameraService } from './camera.service';
import { CameraError } from '../../models/receipt';

describe('CameraService', () => {
  let service: CameraService;
  let mockMediaDevices: jasmine.SpyObj<MediaDevices>;

  beforeEach(() => {
    // Create a mock for MediaDevices
    mockMediaDevices = jasmine.createSpyObj('MediaDevices', ['getUserMedia', 'enumerateDevices']);

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: mockMediaDevices,
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(CameraService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isCameraAvailable', () => {
    it('should return false when mediaDevices is not available', async () => {
      // Mock navigator without mediaDevices
      const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        get: () => undefined,
      });

      const result = await service.isCameraAvailable();

      expect(result).toBe(false);

      // Restore
      if (originalMediaDevices) {
        Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
      }
    });

    it('should return true when video input device is found', async () => {
      const mockDevices = [
        { kind: 'videoinput', deviceId: '1', label: 'Camera', groupId: '1', toJSON: () => ({}) },
      ] as MediaDeviceInfo[];

      mockMediaDevices.enumerateDevices.and.returnValue(Promise.resolve(mockDevices));

      const result = await service.isCameraAvailable();

      expect(result).toBe(true);
    });
  });

  describe('openCameraStream', () => {
    it('should throw error if stream is already active', async () => {
      // First open a stream
      const mockStream = new MediaStream();
      mockMediaDevices.getUserMedia.and.returnValue(Promise.resolve(mockStream));

      await service.openCameraStream();

      // Try to open again
      await expectAsync(service.openCameraStream()).toBeRejectedWithError(
        CameraError,
        'Camera stream already active'
      );

      // Cleanup
      service.closeCameraStream();
    });

    it('should throw PERMISSION_DENIED error when user denies permission', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';

      mockMediaDevices.getUserMedia.and.returnValue(Promise.reject(permissionError));

      await expectAsync(service.openCameraStream()).toBeRejectedWithError(CameraError);

      try {
        await service.openCameraStream();
        fail('Should have thrown CameraError');
      } catch (error) {
        expect(error).toBeInstanceOf(CameraError);
        expect((error as CameraError).code).toBe('PERMISSION_DENIED');
      }
    });

    it('should throw CAMERA_NOT_FOUND error when no camera exists', async () => {
      const notFoundError = new Error('Camera not found');
      notFoundError.name = 'NotFoundError';

      mockMediaDevices.getUserMedia.and.returnValue(Promise.reject(notFoundError));

      await expectAsync(service.openCameraStream()).toBeRejectedWithError(CameraError);

      try {
        await service.openCameraStream();
        fail('Should have thrown CameraError');
      } catch (error) {
        expect(error).toBeInstanceOf(CameraError);
        expect((error as CameraError).code).toBe('CAMERA_NOT_FOUND');
      }
    });
  });

  describe('closeCameraStream', () => {
    it('should stop all tracks when closing stream', async () => {
      const mockTrack = jasmine.createSpyObj('MediaStreamTrack', ['stop']);

      const mockStream = new MediaStream();
      spyOn(mockStream, 'getTracks').and.returnValue([mockTrack]);
      mockMediaDevices.getUserMedia.and.returnValue(Promise.resolve(mockStream));

      await service.openCameraStream();
      service.closeCameraStream();

      expect(mockTrack.stop).toHaveBeenCalled();
      expect(service.getActiveStream()).toBeNull();
    });

    it('should do nothing when no active stream', () => {
      expect(() => service.closeCameraStream()).not.toThrow();
    });
  });
});

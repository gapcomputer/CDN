import { describe, it, expect, vi } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { createPathValidationMiddleware } from '../src/path-validation-middleware';

describe('Path Validation Middleware', () => {
  const mockCdnDirectory = '/mock/cdn/directory';

  // Mock request, response, and next function
  const createMockContext = (filePath: string) => {
    return {
      params: { filePath },
      query: { file: filePath },
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      validatedFilePath: null
    };
  };

  it('should allow valid file path within CDN directory', async () => {
    const middleware = createPathValidationMiddleware(mockCdnDirectory);
    const req: any = createMockContext('valid-file.txt');
    const res: any = {};
    const next = vi.fn();

    // Mock fs.access to simulate file existence
    vi.spyOn(fs, 'access').mockResolvedValue(undefined);

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.validatedFilePath).toBe(path.resolve(mockCdnDirectory, 'valid-file.txt'));
  });

  it('should block directory traversal attempts', async () => {
    const middleware = createPathValidationMiddleware(mockCdnDirectory);
    const req: any = createMockContext('../etc/passwd');
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Access denied')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle non-existent files', async () => {
    const middleware = createPathValidationMiddleware(mockCdnDirectory);
    const req: any = createMockContext('non-existent.txt');
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    // Mock fs.access to simulate file not existing
    vi.spyOn(fs, 'access').mockRejectedValue(new Error('File not found'));

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'File not found'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should require a file path', async () => {
    const middleware = createPathValidationMiddleware(mockCdnDirectory);
    const req: any = { params: {}, query: {} };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'No file path provided'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
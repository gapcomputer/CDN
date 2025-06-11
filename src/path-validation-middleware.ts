import path from 'path';
import fs from 'fs/promises';

/**
 * Middleware to validate file paths and prevent directory traversal attacks
 * @param cdnDirectory Base directory for serving files
 * @returns Express middleware function
 */
export function createPathValidationMiddleware(cdnDirectory: string) {
  return async (req, res, next) => {
    try {
      // Normalize the requested file path
      const requestedFile = req.params.filePath || req.query.file;
      
      if (!requestedFile) {
        return res.status(400).json({ 
          error: 'No file path provided' 
        });
      }

      // Resolve the full path, normalizing and removing any potential traversal attempts
      const normalizedRequestedPath = path.normalize(requestedFile);
      const fullPath = path.resolve(cdnDirectory, normalizedRequestedPath);

      // Ensure the resolved path is within the CDN directory
      const isWithinCdnDirectory = fullPath.startsWith(path.resolve(cdnDirectory));
      
      if (!isWithinCdnDirectory) {
        return res.status(403).json({ 
          error: 'Access denied: File path is outside of the CDN directory' 
        });
      }

      // Check if file exists and is readable
      try {
        await fs.access(fullPath);
      } catch (accessError) {
        return res.status(404).json({ 
          error: 'File not found' 
        });
      }

      // Attach the validated full path to the request for subsequent middleware
      req.validatedFilePath = fullPath;
      next();
    } catch (error) {
      // Handle any unexpected errors
      console.error('Path validation error:', error);
      res.status(500).json({ 
        error: 'Internal server error during path validation' 
      });
    }
  };
}
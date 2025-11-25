import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface StorageConfig {
  type: 'local' | 's3';
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
}

export interface StoredFile {
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  storageType: 'local' | 's3';
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/json',
  'application/zip',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

class StorageService {
  private config: StorageConfig;
  private uploadDir: string;

  constructor() {
    this.config = {
      type: (process.env.STORAGE_TYPE as 'local' | 's3') || 'local',
      localPath: process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads'),
      s3Bucket: process.env.S3_BUCKET,
      s3Region: process.env.S3_REGION || 'us-east-1',
    };

    this.uploadDir = this.config.localPath!;
    this.ensureUploadDirectory();
  }

  private ensureUploadDirectory(): void {
    if (this.config.type === 'local' && !fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      console.log(`[Storage] Created upload directory: ${this.uploadDir}`);
    }
  }

  validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type not allowed: ${file.mimetype}. Allowed types: PDF, images, Office documents, text, CSV, JSON, ZIP`,
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 50MB`,
      };
    }

    return { valid: true };
  }

  async saveFile(file: Express.Multer.File, assessmentId: string): Promise<StoredFile> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (this.config.type === 'local') {
      return this.saveFileLocal(file, assessmentId);
    } else {
      return this.saveFileS3(file, assessmentId);
    }
  }

  private async saveFileLocal(file: Express.Multer.File, assessmentId: string): Promise<StoredFile> {
    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}${ext}`;
    const assessmentDir = path.join(this.uploadDir, assessmentId);

    if (!fs.existsSync(assessmentDir)) {
      fs.mkdirSync(assessmentDir, { recursive: true });
    }

    const storagePath = path.join(assessmentDir, fileName);

    // Move file from temp location to permanent storage
    fs.renameSync(file.path, storagePath);

    return {
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      storagePath: path.relative(this.uploadDir, storagePath),
      storageType: 'local',
    };
  }

  private async saveFileS3(file: Express.Multer.File, assessmentId: string): Promise<StoredFile> {
    // S3 implementation placeholder - would use AWS SDK
    throw new Error('S3 storage not implemented yet. Set STORAGE_TYPE=local or implement S3 upload.');
  }

  async getFile(storagePath: string, storageType: 'local' | 's3'): Promise<{ stream: fs.ReadStream; contentType: string }> {
    if (storageType === 'local') {
      return this.getFileLocal(storagePath);
    } else {
      return this.getFileS3(storagePath);
    }
  }

  private async getFileLocal(storagePath: string): Promise<{ stream: fs.ReadStream; contentType: string }> {
    const fullPath = path.join(this.uploadDir, storagePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }

    // Security: Ensure the resolved path is within the upload directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedUploadDir = path.resolve(this.uploadDir);
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      throw new Error('Invalid file path');
    }

    const stream = fs.createReadStream(fullPath);
    const ext = path.extname(storagePath).toLowerCase();
    const contentType = this.getContentType(ext);

    return { stream, contentType };
  }

  private async getFileS3(storagePath: string): Promise<{ stream: fs.ReadStream; contentType: string }> {
    throw new Error('S3 storage not implemented yet.');
  }

  async deleteFile(storagePath: string, storageType: 'local' | 's3'): Promise<void> {
    if (storageType === 'local') {
      return this.deleteFileLocal(storagePath);
    } else {
      return this.deleteFileS3(storagePath);
    }
  }

  private async deleteFileLocal(storagePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, storagePath);

    // Security check
    const resolvedPath = path.resolve(fullPath);
    const resolvedUploadDir = path.resolve(this.uploadDir);
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      throw new Error('Invalid file path');
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  private async deleteFileS3(storagePath: string): Promise<void> {
    throw new Error('S3 storage not implemented yet.');
  }

  private getContentType(ext: string): string {
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.zip': 'application/zip',
    };

    return contentTypes[ext] || 'application/octet-stream';
  }
}

export const storageService = new StorageService();

import path from "path";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { HttpError } from "../security/http";

const uploadLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many uploads. Please try again later.' } });

function makeUploader(address: "members" | "products") {
  const parse = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: address === 'members' ? 1 : 5, fields: 48, fieldSize: 2048 },
    fileFilter: (_req, file, done) => {
      if (!['image/jpeg', 'image/png'].includes(file.mimetype)) return done(new HttpError(415, 'INVALID_IMAGE', 'Only JPEG and PNG images are supported.'));
      done(null, true);
    } });
  const wrap = (parser: RequestHandler): RequestHandler => (req, res, next) => uploadLimit(req, res, () => parser(req, res, async (error) => {
    if (error) return next(error instanceof multer.MulterError
      ? new HttpError(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400, 'UPLOAD_LIMIT', 'Image upload limit exceeded.') : error);
    const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : [];
    const saved: string[] = [];
    try {
      const prepared: { file: Express.Multer.File; data: Buffer; extension: string }[] = [];
      for (const file of files) {
        const image = sharp(file.buffer, { limitInputPixels: 20_000_000, failOn: 'warning', animated: false });
        const info = await image.metadata();
        if (!['jpeg', 'png'].includes(info.format ?? '') || info.pages && info.pages > 1 ||
            file.mimetype !== (info.format === 'jpeg' ? 'image/jpeg' : 'image/png')) throw new Error('Invalid raster image');
        const data = await (info.format === 'jpeg' ? image.rotate().jpeg({ quality: 90 }) : image.rotate().png()).toBuffer();
        if (data.length > 10 * 1024 * 1024) throw new Error('Decoded image too large');
        prepared.push({ file, data, extension: info.format === 'jpeg' ? 'jpg' : 'png' });
      }
      const root = path.resolve(req.app.locals.security.uploadsRoot, address);
      if (prepared.length) await mkdir(root, { recursive: true });
      for (const { file, data, extension } of prepared) {
        const filename = `${randomUUID()}.${extension}`;
        const target = path.join(root, filename);
        await writeFile(target, data, { flag: 'wx', mode: 0o640 });
        saved.push(target);
        file.path = `uploads/${address}/${filename}`;
        file.filename = filename;
        file.size = data.length;
        file.buffer = Buffer.alloc(0);
      }
      res.once('finish', () => {
        if (!res.locals.uploadCommitted) void Promise.all(saved.map((file) => unlink(file).catch(() => {})));
      });
      next();
    } catch {
      await Promise.all(saved.map((file) => unlink(file).catch(() => {})));
      next(new HttpError(415, 'INVALID_IMAGE', 'The selected file is not a valid JPEG or PNG image.'));
    }
  }));
  return { single: (field: string) => wrap(parse.single(field)), array: (field: string, max: number) => wrap(parse.array(field, max)) };
}
export default makeUploader;

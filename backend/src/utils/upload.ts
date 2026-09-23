import fs from "fs";
import path from "path";
import multer from "multer";

// folder where property photos are saved: backend/uploads/properties
export const PROPERTY_UPLOAD_DIR = path.join(process.cwd(), "uploads", "properties");

// create the folder if it does not exist yet
fs.mkdirSync(PROPERTY_UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const INVALID_TYPE_MESSAGE = "only jpg, png and webp images are allowed";

// where and with what name each file is saved
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PROPERTY_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // "house.JPG" -> "1727100000000-482913.jpg" (unique name, keeps extension)
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1000000) + ext;
    cb(null, uniqueName);
  },
});

export const uploadPropertyImages = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per image
    files: 10,                 // max 10 images in one request
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true); // accept
    } else {
      cb(new Error(INVALID_TYPE_MESSAGE));
    }
  },
});

// delete a file from disk; ignore if it is already gone
export function deleteFile(filePath: string) {
  fs.unlink(filePath, () => {});
}

// "/uploads/properties/abc.jpg" (url in DB) -> full path on disk
export function urlToDiskPath(url: string) {
  return path.join(PROPERTY_UPLOAD_DIR, path.basename(url));
}

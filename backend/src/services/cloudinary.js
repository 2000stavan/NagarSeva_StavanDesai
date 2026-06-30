import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

const configured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function uploadImage(filePath, folder = 'community-hero') {
  if (configured) {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
    });
    fs.unlink(filePath, () => {});
    return result.secure_url;
  }

  // Fallback: serve locally via backend static route
  const filename = filePath.split('/').pop();
  const url = `${process.env.BACKEND_URL || 'http://localhost:3001'}/uploads/${filename}`;
  console.log('[Cloudinary] Using local upload fallback:', url);
  return url;
}

export async function uploadBuffer(buffer, originalName) {
  if (configured) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: 'community-hero', resource_type: 'image' }, (err, result) => {
          if (err) reject(err);
          else resolve(result.secure_url);
        })
        .end(buffer);
    });
  }
  return 'https://images.unsplash.com/photo-1584463623578-3b3b44b82fc6?auto=format&fit=crop&w=800&q=80';
}

import { Router } from "express";
import { prisma } from "../prisma";
import { uploadPropertyImages, deleteFile, urlToDiskPath } from "../utils/upload";

const router = Router();

const MAX_IMAGES_PER_PROPERTY = 10;

// remove files multer already saved (used when we reject the request)
function removeUploadedFiles(files: Express.Multer.File[]) {
  for (const file of files) {
    deleteFile(file.path);
  }
}



//================================================================================== UPLOAD images ==========================================================================
// POST /api/property-images/5      (5 = propertyId)
// body: form-data, key "images" (type File), select 1 to 10 images
// uploadPropertyImages.array(...) runs first: it saves the files to disk and puts them in req.files

router.post("/:propertyId", uploadPropertyImages.array("images", 10), async (req, res) => {

  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ message: "select at least one image (form-data key: images)" });
  }

  const propertyId = Number(req.params.propertyId);
  if (Number.isNaN(propertyId)) {
    removeUploadedFiles(files);
    return res.status(400).json({ message: "invalid propertyId" });
  }

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) {
    removeUploadedFiles(files);
    return res.status(404).json({ message: "property not found" });
  }

  // max 10 images per property in total
  const existingCount = await prisma.propertyImage.count({ where: { propertyId: propertyId } });
  if (existingCount + files.length > MAX_IMAGES_PER_PROPERTY) {
    removeUploadedFiles(files);
    return res.status(400).json({
      message: `max ${MAX_IMAGES_PER_PROPERTY} images per property. Already has ${existingCount}.`,
    });
  }

  // if the property has no cover yet, the first new image becomes the cover
  const coverCount = await prisma.propertyImage.count({
    where: { propertyId: propertyId, isCover: true },
  });

  for (let i = 0; i < files.length; i++) {
    await prisma.propertyImage.create({
      data: {
        propertyId: propertyId,
        url: "/uploads/properties/" + files[i].filename,
        isCover: coverCount === 0 && i === 0,
        sortOrder: existingCount + i,
      },
    });
  }

  const images = await prisma.propertyImage.findMany({
    where: { propertyId: propertyId },
    orderBy: { sortOrder: "asc" },
  });

  res.status(201).json(images);
});




//================================================================================== LIST images of one property ==========================================================================
// GET /api/property-images/by-property/5

router.get("/by-property/:propertyId", async (req, res) => {

  const propertyId = Number(req.params.propertyId);
  if (Number.isNaN(propertyId)) {
    return res.status(400).json({ message: "invalid propertyId" });
  }

  const images = await prisma.propertyImage.findMany({
    where: { propertyId: propertyId },
    orderBy: { sortOrder: "asc" },
  });

  res.json(images);
});




//================================================================================== SET cover image ==========================================================================
// PUT /api/property-images/12/cover      (12 = imageId)

router.put("/:imageId/cover", async (req, res) => {

  const imageId = Number(req.params.imageId);
  if (Number.isNaN(imageId)) {
    return res.status(400).json({ message: "invalid imageId" });
  }

  const image = await prisma.propertyImage.findUnique({ where: { id: imageId } });
  if (!image) {
    return res.status(404).json({ message: "image not found" });
  }

  // $transaction = both steps succeed together or neither happens
  await prisma.$transaction([
    // 1. remove cover from all images of this property
    prisma.propertyImage.updateMany({
      where: { propertyId: image.propertyId },
      data: { isCover: false },
    }),
    // 2. make this image the cover
    prisma.propertyImage.update({
      where: { id: imageId },
      data: { isCover: true },
    }),
  ]);

  res.json({ message: "cover image updated" });
});




//================================================================================== DELETE image ==========================================================================
// DELETE /api/property-images/12      (12 = imageId)

router.delete("/:imageId", async (req, res) => {

  const imageId = Number(req.params.imageId);
  if (Number.isNaN(imageId)) {
    return res.status(400).json({ message: "invalid imageId" });
  }

  const image = await prisma.propertyImage.findUnique({ where: { id: imageId } });
  if (!image) {
    return res.status(404).json({ message: "image not found" });
  }

  await prisma.propertyImage.delete({ where: { id: imageId } });
  deleteFile(urlToDiskPath(image.url));

  // if we deleted the cover, make the next image the new cover
  if (image.isCover) {
    const nextImage = await prisma.propertyImage.findFirst({
      where: { propertyId: image.propertyId },
      orderBy: { sortOrder: "asc" },
    });
    if (nextImage) {
      await prisma.propertyImage.update({
        where: { id: nextImage.id },
        data: { isCover: true },
      });
    }
  }

  res.json({ message: "image deleted" });
});



export default router;

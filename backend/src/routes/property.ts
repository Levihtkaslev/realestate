import { Router } from "express";
import { prisma } from "../prisma";
import { Prisma } from "../generated/prisma/client";
import { makeSlug } from "../utils/slug";
import { deleteFile, urlToDiskPath } from "../utils/upload";

const router = Router();

const LISTING_TYPES = ["SALE", "RENT"];
const FURNISHINGS = ["FURNISHED", "SEMI_FURNISHED", "UNFURNISHED"];
const STATUSES = ["ACTIVE", "INACTIVE", "SOLD"];

// small version for list cards
const cardInclude = {
  propertyType: { select: { id: true, name: true } },
  city: { select: { id: true, name: true } },
  locality: { select: { id: true, name: true } },
  images: { where: { isCover: true }, select: { url: true } }, // only the cover photo
};

// full version for the detail page
const detailInclude = {
  owner: { select: { id: true, name: true, phone: true } },
  propertyType: { select: { id: true, name: true } },
  city: { select: { id: true, name: true, slug: true } },
  locality: { select: { id: true, name: true, slug: true } },
  amenities: { select: { amenity: { select: { id: true, name: true } } } },
  images: { orderBy: { sortOrder: "asc" as const } }, // all photos, in gallery order
};



//================================================================================== POST property ==========================================================================
// POST /api/properties
// body: { ownerId, title, description, listingType, price, areaSqft, propertyTypeId, cityId, localityId,
//         bedrooms?, bathrooms?, furnishing?, address?, amenityIds?: [1, 2] }

router.post("/", async (req, res) => {

  const {
    ownerId, title, description, listingType, price, areaSqft,
    propertyTypeId, cityId, localityId,
    bedrooms, bathrooms, furnishing, address, amenityIds,
  } = req.body;

  
  if (!ownerId || !title || !description || !listingType || !price || !areaSqft ||
      !propertyTypeId || !cityId || !localityId) {
    return res.status(400).json({
      message: "ownerId, title, description, listingType, price, areaSqft, propertyTypeId, cityId, localityId are required",
    });
  }


  if (!LISTING_TYPES.includes(listingType)) {
    return res.status(400).json({ message: "listingType must be SALE or RENT" });
  }
  if (Number(price) <= 0 || Number(areaSqft) <= 0) {
    return res.status(400).json({ message: "price and areaSqft must be greater than 0" });
  }
  if (furnishing && !FURNISHINGS.includes(furnishing)) {
    return res.status(400).json({ message: "furnishing must be FURNISHED, SEMI_FURNISHED or UNFURNISHED" });
  }

  const owner = await prisma.user.findUnique({ where: { id: Number(ownerId) } });
  if (!owner) {
    return res.status(400).json({ message: "invalid ownerId" });
  }

  const propertyType = await prisma.propertyType.findUnique({ where: { id: Number(propertyTypeId) } });
  if (!propertyType || !propertyType.isActive) {
    return res.status(400).json({ message: "invalid propertyTypeId" });
  }

  const city = await prisma.city.findUnique({ where: { id: Number(cityId) } });
  if (!city || !city.isActive) {
    return res.status(400).json({ message: "invalid cityId" });
  }

  const locality = await prisma.locality.findUnique({ where: { id: Number(localityId) } });
  if (!locality || !locality.isActive) {
    return res.status(400).json({ message: "invalid localityId" });
  }


  if (locality.cityId !== city.id) {
    return res.status(400).json({ message: "locality does not belong to this city" });
  }

  //  amenities (optional) must all exist
  let amenityList: number[] = [];
  if (amenityIds) {
    if (!Array.isArray(amenityIds)) {
      return res.status(400).json({ message: "amenityIds must be an array, e.g. [1, 2]" });
    }
    amenityList = amenityIds.map(Number);

    const foundCount = await prisma.amenity.count({
      where: { id: { in: amenityList }, isActive: true },
    });
    if (foundCount !== amenityList.length) {
      return res.status(400).json({ message: "invalid amenityIds" });
    }
  }

  //  unique slug: "2 BHK Flat" -> "2-bhk-flat-mfx3k2a"
  const slug = makeSlug(title) + "-" + Date.now().toString(36);

  // save property + its amenity links in one go
  const property = await prisma.property.create({
    data: {
      title: title.trim(),
      slug: slug,
      description: description.trim(),
      listingType: listingType,
      price: Number(price),
      areaSqft: Number(areaSqft),
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      furnishing: furnishing ? furnishing : null,
      address: address ? address.trim() : null,
      ownerId: owner.id,
      propertyTypeId: propertyType.id,
      cityId: city.id,
      localityId: locality.id,
      amenities: {
        create: amenityList.map((amenityId) => ({ amenityId: amenityId })),
      },
    },
    include: detailInclude,
  });

  res.status(201).json(property);
});




//================================================================================== LIST properties ==========================================================================
// GET /api/properties   (public: only ACTIVE, newest first)
// NOTE: filters, sorting and pagination come in step 5. For now only latest 20.

router.get("/", async (req, res) => {

  const properties = await prisma.property.findMany({
    where: { status: "ACTIVE" },
    include: cardInclude,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  res.json(properties);
});




//================================================================================== LIST properties of one owner ==========================================================================
// GET /api/properties/by-owner/3   ("My listings" page - all statuses)

router.get("/by-owner/:ownerId", async (req, res) => {

  const ownerId = Number(req.params.ownerId);
  if (Number.isNaN(ownerId)) {
    return res.status(400).json({ message: "invalid ownerId" });
  }

  const properties = await prisma.property.findMany({
    where: { ownerId: ownerId },
    include: cardInclude,
    orderBy: { createdAt: "desc" },
  });

  res.json(properties);
});




//================================================================================== GET property ==========================================================================
// GET /api/properties/1   (detail page)

router.get("/:id", async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const property = await prisma.property.findUnique({
    where: { id: id },
    include: detailInclude,
  });
  if (!property) {
    return res.status(404).json({ message: "property not found" });
  }

  res.json(property);
});




//================================================================================== UPDATE property ==========================================================================
// PUT /api/properties/1     send only the fields you want to change
// body: { title?, description?, listingType?, price?, areaSqft?, bedrooms?, bathrooms?, furnishing?,
//         address?, status?, propertyTypeId?, cityId?, localityId?, amenityIds? }
// NOTE: "only the owner can edit" check comes with auth (step 8)

router.put("/:id", async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const property = await prisma.property.findUnique({ where: { id: id } });
  if (!property) {
    return res.status(404).json({ message: "property not found" });
  }

  const {
    title, description, listingType, price, areaSqft, bedrooms, bathrooms,
    furnishing, address, status, propertyTypeId, cityId, localityId, amenityIds,
  } = req.body;

  // Prisma's ready-made type for "fields allowed in an update"
  const data: Prisma.PropertyUncheckedUpdateInput = {};

  // --- simple fields ---
  if (title) data.title = title.trim();
  if (description) data.description = description.trim();
  if (address) data.address = address.trim();
  if (bedrooms) data.bedrooms = Number(bedrooms);
  if (bathrooms) data.bathrooms = Number(bathrooms);

  if (listingType) {
    if (!LISTING_TYPES.includes(listingType)) {
      return res.status(400).json({ message: "listingType must be SALE or RENT" });
    }
    data.listingType = listingType;
  }

  if (price) {
    if (Number(price) <= 0) {
      return res.status(400).json({ message: "price must be greater than 0" });
    }
    data.price = Number(price);
  }

  if (areaSqft) {
    if (Number(areaSqft) <= 0) {
      return res.status(400).json({ message: "areaSqft must be greater than 0" });
    }
    data.areaSqft = Number(areaSqft);
  }

  if (furnishing) {
    if (!FURNISHINGS.includes(furnishing)) {
      return res.status(400).json({ message: "furnishing must be FURNISHED, SEMI_FURNISHED or UNFURNISHED" });
    }
    data.furnishing = furnishing;
  }

  if (status) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: "status must be ACTIVE, INACTIVE or SOLD" });
    }
    data.status = status;
  }

  // --- property type ---
  if (propertyTypeId) {
    const propertyType = await prisma.propertyType.findUnique({ where: { id: Number(propertyTypeId) } });
    if (!propertyType || !propertyType.isActive) {
      return res.status(400).json({ message: "invalid propertyTypeId" });
    }
    data.propertyTypeId = propertyType.id;
  }

  // --- city / locality: the final pair must still match ---
  if (cityId || localityId) {
    let finalCityId = property.cityId;
    if (cityId) finalCityId = Number(cityId);

    let finalLocalityId = property.localityId;
    if (localityId) finalLocalityId = Number(localityId);

    const city = await prisma.city.findUnique({ where: { id: finalCityId } });
    if (!city || !city.isActive) {
      return res.status(400).json({ message: "invalid cityId" });
    }

    const locality = await prisma.locality.findUnique({ where: { id: finalLocalityId } });
    if (!locality || !locality.isActive) {
      return res.status(400).json({ message: "invalid localityId" });
    }

    if (locality.cityId !== city.id) {
      return res.status(400).json({ message: "locality does not belong to this city" });
    }

    data.cityId = city.id;
    data.localityId = locality.id;
  }

  // --- amenities: replace the old list with the new list ---
  if (amenityIds) {
    if (!Array.isArray(amenityIds)) {
      return res.status(400).json({ message: "amenityIds must be an array, e.g. [1, 2]" });
    }
    const amenityList: number[] = amenityIds.map(Number);

    const foundCount = await prisma.amenity.count({
      where: { id: { in: amenityList }, isActive: true },
    });
    if (foundCount !== amenityList.length) {
      return res.status(400).json({ message: "invalid amenityIds" });
    }

    data.amenities = {
      deleteMany: {}, // remove all old links of this property
      create: amenityList.map((amenityId) => ({ amenityId: amenityId })), // add new links
    };
  }

  const updated = await prisma.property.update({
    where: { id: id },
    data: data,
    include: detailInclude,
  });

  res.json(updated);
});




//================================================================================== DELETE property ==========================================================================
// DELETE /api/properties/1   (its amenity links are deleted automatically - Cascade)
// NOTE: "only the owner can delete" check comes with auth (step 8)

router.delete("/:id", async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const property = await prisma.property.findUnique({ where: { id: id } });
  if (!property) {
    return res.status(404).json({ message: "property not found" });
  }

  // get image urls first, so we can remove the files from disk after deleting
  const images = await prisma.propertyImage.findMany({ where: { propertyId: id } });

  await prisma.property.delete({ where: { id: id } }); // image rows are deleted by Cascade

  for (const image of images) {
    deleteFile(urlToDiskPath(image.url));
  }

  res.json({ message: "property deleted" });
});



export default router;

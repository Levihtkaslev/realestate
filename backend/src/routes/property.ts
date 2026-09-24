import { Router } from "express";
import { prisma } from "../prisma";
import { Prisma } from "../generated/prisma/client";
import { makeSlug } from "../utils/slug";
import { deleteFile, urlToDiskPath } from "../utils/upload";
import { requireLogin } from "../middlewares/auth";

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


router.post("/", requireLogin, async (req, res) => {

  const {
    title, description, listingType, price, areaSqft,
    propertyTypeId, cityId, localityId,
    bedrooms, bathrooms, furnishing, address, amenityIds,
  } = req.body;

  // owner comes from the login token, never from the body
  const ownerId = req.user.userId;

  if (!title || !description || !listingType || !price || !areaSqft ||
      !propertyTypeId || !cityId || !localityId) {
    return res.status(400).json({
      message: "title, description, listingType, price, areaSqft, propertyTypeId, cityId, localityId are required",
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

  // the user of the token must still exist (maybe deleted after login)
  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner) {
    return res.status(401).json({ message: "user not found, please login again" });
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




//================================================================================== MY properties ==========================================================================
// GET /api/properties/mine      LOGIN REQUIRED   ("My listings" page - all statuses)
// NOTE: must stay ABOVE router.get("/:id"), otherwise "mine" is treated as an id

router.get("/mine", requireLogin, async (req, res) => {

  const properties = await prisma.property.findMany({
    where: { ownerId: req.user.userId },
    include: cardInclude,
    orderBy: { createdAt: "desc" },
  });

  res.json(properties);
});




//================================================================================== SEARCH properties ==========================================================================
// GET /api/properties/search?listingType=SALE&cityId=5&bedrooms=2&minPrice=3000000&maxPrice=6000000&sort=price_asc
// public page. only listingType is required, every other filter is optional.
// sort: newest (default) | price_asc | price_desc
// pagination (cursor): limit = how many per call (default 20, max 50)
//                      cursor = "nextCursor" from the previous response (leave empty for the first call)
// NOTE: must stay ABOVE router.get("/:id"), otherwise "search" is treated as an id

router.get("/search", async (req, res) => {

  const { listingType, cityId, localityId, propertyTypeId, bedrooms, minPrice, maxPrice, sort, cursor } = req.query;

  // 1. listingType is required (Buy tab or Rent tab)
  if (listingType !== "SALE" && listingType !== "RENT") {
    return res.status(400).json({ message: "listingType must be SALE or RENT" });
  }

  // 2. start with the filters that are always there
  const where: Prisma.PropertyWhereInput = {
    status: "ACTIVE",
    listingType: listingType,
  };

  // 3. add each filter only if the user sent it
  if (cityId) {
    where.cityId = Number(cityId);
  }
  if (localityId) {
    where.localityId = Number(localityId);
  }
  if (propertyTypeId) {
    where.propertyTypeId = Number(propertyTypeId);
  }
  if (bedrooms) {
    where.bedrooms = Number(bedrooms);
  }

  // 4. budget: min only, max only, or both
  if (minPrice || maxPrice) {
    const priceFilter: Prisma.IntFilter = {};
    if (minPrice) {
      priceFilter.gte = Number(minPrice); // gte = greater than or equal
    }
    if (maxPrice) {
      priceFilter.lte = Number(maxPrice); // lte = less than or equal
    }
    where.price = priceFilter;
  }

  // 5. every number must be a real number ("abc" is not allowed)
  const numbersToCheck = [cityId, localityId, propertyTypeId, bedrooms, minPrice, maxPrice, cursor];
  for (const value of numbersToCheck) {
    if (value && Number.isNaN(Number(value))) {
      return res.status(400).json({ message: "cityId, localityId, propertyTypeId, bedrooms, minPrice, maxPrice, cursor must be numbers" });
    }
  }

  // how many items per call: default 20, never more than 50
  let limit = 20;
  if (req.query.limit) {
    limit = Number(req.query.limit);
    if (Number.isNaN(limit) || limit < 1) {
      return res.status(400).json({ message: "limit must be a number from 1 to 50" });
    }
    if (limit > 50) {
      limit = 50;
    }
  }

  // 6. sorting. id is added as a tie-breaker: same price -> fixed order
  let orderBy: Prisma.PropertyOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];

  if (sort === "price_asc") {
    orderBy = [{ price: "asc" }, { id: "asc" }];
  }
  if (sort === "price_desc") {
    orderBy = [{ price: "desc" }, { id: "desc" }];
  }

  // 7. build the query. we ask for ONE extra row (limit + 1) only to know "is there a next page?"
  const query: Prisma.PropertyFindManyArgs = {
    where: where,
    include: cardInclude,
    orderBy: orderBy,
    take: limit + 1,
  };

  // 8. cursor = "continue after this property id"
  //    skip: 1 -> do not repeat the cursor property itself (it was the last item of the previous page)
  if (cursor) {
    query.cursor = { id: Number(cursor) };
    query.skip = 1;
  }

  const properties = await prisma.property.findMany(query);

  // 9. got the extra row? then there is a next page. remove the extra row before sending
  let hasMore = false;
  if (properties.length > limit) {
    hasMore = true;
    properties.pop();
  }

  // 10. the frontend sends this back as ?cursor=... to get the next page
  let nextCursor = null;
  if (hasMore) {
    nextCursor = properties[properties.length - 1].id;
  }

  res.json({
    items: properties,
    hasMore: hasMore,
    nextCursor: nextCursor,
  });
});




//================================================================================== SIMILAR properties ==========================================================================
// GET /api/properties/100/similar   (detail page -> "Similar properties", max 6)

router.get("/:id/similar", async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const property = await prisma.property.findUnique({ where: { id: id } });
  if (!property) {
    return res.status(404).json({ message: "property not found" });
  }

  // 1. candidates: same sale/rent, same city, same type, price +-30%, not itself
  const where: Prisma.PropertyWhereInput = {
    listingType: property.listingType,
    status: "ACTIVE",
    cityId: property.cityId,
    propertyTypeId: property.propertyTypeId,
    id: { not: property.id },
    price: {
      gte: Math.floor(property.price * 0.7),
      lte: Math.ceil(property.price * 1.3),
    },
  };

  // homes only: 2 BHK -> 1, 2 or 3 BHK
  if (property.bedrooms !== null) {
    where.bedrooms = { gte: property.bedrooms - 1, lte: property.bedrooms + 1 };
  }

  const candidates = await prisma.property.findMany({
    where: where,
    include: cardInclude,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // 2. score: same area +3, same BHK +2, closer price = more points (max +2)
  const scored = [];
  for (const candidate of candidates) {
    let score = 0;

    if (candidate.localityId === property.localityId) {
      score = score + 3;
    }
    if (candidate.bedrooms === property.bedrooms) {
      score = score + 2;
    }

    const gapPercent = (Math.abs(candidate.price - property.price) / property.price) * 100;
    score = score + 2 * (1 - gapPercent / 30); // same price = 2, 30% away = 0

    scored.push({ score: score, property: candidate });
  }

  // 3. highest score first, keep 6
  scored.sort((a, b) => b.score - a.score);

  let result = [];
  for (const item of scored.slice(0, 6)) {
    result.push(item.property);
  }

  // 4. less than 6? fill with newest from the same city (any type)
  if (result.length < 6) {
    const skipIds = [property.id];
    for (const p of result) {
      skipIds.push(p.id);
    }

    const extra = await prisma.property.findMany({
      where: {
        listingType: property.listingType,
        status: "ACTIVE",
        cityId: property.cityId,
        id: { notIn: skipIds },
      },
      include: cardInclude,
      orderBy: { createdAt: "desc" },
      take: 6 - result.length,
    });

    result = result.concat(extra);
  }

  res.json(result);
});




//================================================================================== GET property by slug (SEO) ==========================================================================
// GET /api/properties/slug/2-bhk-apartment-in-tambaram-mfx3k2a     PUBLIC
// the frontend detail page URL uses the slug (good for Google), not the number id

router.get("/slug/:slug", async (req, res) => {

  const property = await prisma.property.findUnique({
    where: { slug: req.params.slug }, // slug is unique -> fast lookup by its index
    include: detailInclude,
  });
  if (!property) {
    return res.status(404).json({ message: "property not found" });
  }

  res.json(property);
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
// LOGIN REQUIRED - only the owner (or ADMIN) can edit

router.put("/:id", requireLogin, async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const property = await prisma.property.findUnique({ where: { id: id } });
  if (!property) {
    return res.status(404).json({ message: "property not found" });
  }

  // OWNER CHECK: is this property mine?
  if (property.ownerId !== req.user.userId && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "you can edit only your own property" });
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
// LOGIN REQUIRED - only the owner (or ADMIN) can delete

router.delete("/:id", requireLogin, async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const property = await prisma.property.findUnique({ where: { id: id } });
  if (!property) {
    return res.status(404).json({ message: "property not found" });
  }

  // OWNER CHECK: is this property mine?
  if (property.ownerId !== req.user.userId && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "you can delete only your own property" });
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

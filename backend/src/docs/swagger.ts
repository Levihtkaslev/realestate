// Swagger / OpenAPI description of every API.
// Shown as a web page at   http://localhost:5000/api-docs   (see index.ts)
// This file only DESCRIBES the APIs, it does not change how they work.
// When you add or change an API, update it here too.
//
// How to test a protected API on the page:
//   1. POST /api/auth/login -> "Try it out" -> copy "accessToken"
//   2. click the green "Authorize" button at the top -> paste the token -> Authorize
//   3. now every 🔒 API sends   Authorization: Bearer <token>

// ---------- small pieces used many times ----------

const login = [{ bearerAuth: [] }]; // this API needs the access token

const idParam = { name: "id", in: "path", required: true, schema: { type: "integer" }, example: 1 };

const errorBody = {
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
};

// common answers
const ok = { description: "OK" };
const created = { description: "Created" };
const bad = { description: "Bad request (missing or wrong fields)", ...errorBody };
const noLogin = { description: "Not logged in / invalid or expired token", ...errorBody };
const noPermission = { description: "Not allowed (not the owner / not admin)", ...errorBody };
const notFound = { description: "Not found", ...errorBody };
const conflict = { description: "Already exists / linked to other data", ...errorBody };
const tooMany = { description: "Too many requests (rate limit)", ...errorBody };

// JSON body helper: jsonBody({ name: "Chennai" }) -> request body with that example
function jsonBody(example: object) {
  return { required: true, content: { "application/json": { example: example } } };
}

// a master (state, city, ...) has the same 5 APIs: list, one, create, update, delete
function masterPaths(tag: string, url: string, createExample: object) {
  return {
    [url]: {
      get: {
        tags: [tag], summary: "List (public). Only active, or ?all=true for all",
        parameters: [{ name: "all", in: "query", schema: { type: "boolean" } }],
        responses: { 200: ok },
      },
      post: {
        tags: [tag], summary: "Create (admin only)", security: login,
        requestBody: jsonBody(createExample),
        responses: { 201: created, 400: bad, 401: noLogin, 403: noPermission, 409: conflict },
      },
    },
    [url + "/{id}"]: {
      get: {
        tags: [tag], summary: "Get one (public)", parameters: [idParam],
        responses: { 200: ok, 404: notFound },
      },
      put: {
        tags: [tag], summary: "Update (admin only). Send only fields to change; isActive: false hides it",
        security: login, parameters: [idParam],
        requestBody: jsonBody({ ...createExample, isActive: true }),
        responses: { 200: ok, 400: bad, 401: noLogin, 403: noPermission, 404: notFound, 409: conflict },
      },
      delete: {
        tags: [tag], summary: "Delete (admin only). Blocked (409) if other data uses it",
        security: login, parameters: [idParam],
        responses: { 200: ok, 401: noLogin, 403: noPermission, 404: notFound, 409: conflict },
      },
    },
  };
}

// ---------- the document ----------

export const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Real Estate Listing API",
    version: "1.0.0",
    description:
      "Backend of a 99acres / NoBroker style platform.\n\n" +
      "**Login:** call `POST /api/auth/login`, copy `accessToken`, click **Authorize** and paste it. " +
      "APIs with a 🔒 then work.\n\n" +
      "**Errors** always look like `{ \"message\": \"...\" }`.\n\n" +
      "**Admin (from seed):** admin@realestate.local / admin123",
  },
  servers: [{ url: "http://localhost:5000" }],

  tags: [
    { name: "Auth", description: "Register, login, tokens" },
    { name: "Properties", description: "Listings, search, similar" },
    { name: "Property Images", description: "Photos of a property (owner only)" },
    { name: "Enquiries", description: "Contact the owner" },
    { name: "States" }, { name: "Cities" }, { name: "Localities" },
    { name: "Property Types" }, { name: "Amenities" },
    { name: "Users", description: "Admin only" },
  ],

  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { message: { type: "string", example: "property not found" } },
      },
    },
  },

  paths: {

    // ================= AUTH =================
    "/api/auth/register": {
      post: {
        tags: ["Auth"], summary: "Create an account (max 10 tries / 15 min per IP)",
        requestBody: jsonBody({ name: "Ravi", email: "ravi@test.com", phone: "9876543210", password: "secret123" }),
        responses: { 201: created, 400: bad, 409: conflict, 429: tooMany },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"], summary: "Login -> accessToken (15 min) + refreshToken (7 days)",
        requestBody: jsonBody({ email: "admin@realestate.local", password: "admin123" }),
        responses: { 200: ok, 400: bad, 401: noLogin, 429: tooMany },
      },
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"], summary: "New accessToken + new refreshToken (old refresh token is deleted)",
        requestBody: jsonBody({ refreshToken: "paste-refresh-token-here" }),
        responses: { 200: ok, 400: bad, 401: noLogin },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"], summary: "Delete the refresh token (logout this device)",
        requestBody: jsonBody({ refreshToken: "paste-refresh-token-here" }),
        responses: { 200: ok, 400: bad },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"], summary: "Who am I", security: login,
        responses: { 200: ok, 401: noLogin },
      },
    },

    // ================= PROPERTIES =================
    "/api/properties": {
      get: {
        tags: ["Properties"], summary: "Latest 20 active properties (public)",
        responses: { 200: ok },
      },
      post: {
        tags: ["Properties"], summary: "Post a property (owner = logged-in user)", security: login,
        requestBody: jsonBody({
          title: "2 BHK Flat near Metro", description: "Nice flat, east facing",
          listingType: "SALE", price: 4500000, areaSqft: 1100,
          propertyTypeId: 1, cityId: 1, localityId: 1,
          bedrooms: 2, bathrooms: 2, furnishing: "SEMI_FURNISHED", address: "12, 3rd Street",
          amenityIds: [1, 2],
        }),
        responses: { 201: created, 400: bad, 401: noLogin },
      },
    },
    "/api/properties/search": {
      get: {
        tags: ["Properties"],
        summary: "Search with filters, sort and cursor pagination (public)",
        description:
          "First call without `cursor`. If `hasMore` is true, call again with `cursor` = `nextCursor`.\n\n" +
          "Response: `{ items: [...], hasMore: true, nextCursor: 4521 }`",
        parameters: [
          { name: "listingType", in: "query", required: true, schema: { type: "string", enum: ["SALE", "RENT"] }, example: "SALE" },
          { name: "cityId", in: "query", schema: { type: "integer" } },
          { name: "localityId", in: "query", schema: { type: "integer" } },
          { name: "propertyTypeId", in: "query", schema: { type: "integer" } },
          { name: "bedrooms", in: "query", schema: { type: "integer" } },
          { name: "minPrice", in: "query", schema: { type: "integer" }, description: "rupees" },
          { name: "maxPrice", in: "query", schema: { type: "integer" }, description: "rupees" },
          { name: "sort", in: "query", schema: { type: "string", enum: ["newest", "price_asc", "price_desc"] } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 50 } },
          { name: "cursor", in: "query", schema: { type: "integer" }, description: "nextCursor from the previous page" },
        ],
        responses: { 200: ok, 400: bad },
      },
    },
    "/api/properties/mine": {
      get: {
        tags: ["Properties"], summary: "My listings (all statuses)", security: login,
        responses: { 200: ok, 401: noLogin },
      },
    },
    "/api/properties/slug/{slug}": {
      get: {
        tags: ["Properties"], summary: "Property detail by SEO slug (public)",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" }, example: "2-bhk-flat-near-metro-mfx3k2a" }],
        responses: { 200: ok, 404: notFound },
      },
    },
    "/api/properties/{id}": {
      get: {
        tags: ["Properties"], summary: "Property detail: images, amenities, owner contact (public)",
        parameters: [idParam],
        responses: { 200: ok, 400: bad, 404: notFound },
      },
      put: {
        tags: ["Properties"], summary: "Edit (owner or admin). Send only fields to change", security: login,
        parameters: [idParam],
        requestBody: jsonBody({ price: 4800000, status: "SOLD", amenityIds: [1, 5] }),
        responses: { 200: ok, 400: bad, 401: noLogin, 403: noPermission, 404: notFound },
      },
      delete: {
        tags: ["Properties"], summary: "Delete (owner or admin). Also removes its images and enquiries", security: login,
        parameters: [idParam],
        responses: { 200: ok, 401: noLogin, 403: noPermission, 404: notFound },
      },
    },
    "/api/properties/{id}/similar": {
      get: {
        tags: ["Properties"], summary: "Up to 6 similar properties (public)",
        parameters: [idParam],
        responses: { 200: ok, 404: notFound },
      },
    },

    // ================= PROPERTY IMAGES =================
    "/api/property-images/{propertyId}": {
      post: {
        tags: ["Property Images"], summary: "Upload 1-10 photos (owner or admin). jpg/png/webp, max 5 MB each",
        security: login,
        parameters: [{ name: "propertyId", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { images: { type: "array", items: { type: "string", format: "binary" } } },
              },
            },
          },
        },
        responses: { 201: created, 400: bad, 401: noLogin, 403: noPermission, 404: notFound },
      },
    },
    "/api/property-images/by-property/{propertyId}": {
      get: {
        tags: ["Property Images"], summary: "All photos of a property (public)",
        parameters: [{ name: "propertyId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: ok },
      },
    },
    "/api/property-images/{imageId}/cover": {
      put: {
        tags: ["Property Images"], summary: "Make this photo the cover (owner or admin)", security: login,
        parameters: [{ name: "imageId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: ok, 401: noLogin, 403: noPermission, 404: notFound },
      },
    },
    "/api/property-images/{imageId}": {
      delete: {
        tags: ["Property Images"], summary: "Delete a photo (owner or admin)", security: login,
        parameters: [{ name: "imageId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: ok, 401: noLogin, 403: noPermission, 404: notFound },
      },
    },

    // ================= ENQUIRIES =================
    "/api/inquiries": {
      post: {
        tags: ["Enquiries"],
        summary: "Send an enquiry (sender = logged-in user). No duplicates, max 5/hour per user, 20/hour per IP",
        security: login,
        requestBody: jsonBody({ propertyId: 1, message: "Is this property still available?" }),
        responses: { 201: created, 400: bad, 401: noLogin, 404: notFound, 409: conflict, 429: tooMany },
      },
    },
    "/api/inquiries/received": {
      get: {
        tags: ["Enquiries"], summary: "Enquiries on MY properties (with sender name, email, phone)", security: login,
        responses: { 200: ok, 401: noLogin },
      },
    },
    "/api/inquiries/sent": {
      get: {
        tags: ["Enquiries"], summary: "Enquiries I sent", security: login,
        responses: { 200: ok, 401: noLogin },
      },
    },

    // ================= MASTERS =================
    ...masterPaths("States", "/api/states", { name: "Tamil Nadu", code: "TN" }),
    ...masterPaths("Cities", "/api/cities", { name: "Chennai", stateId: 23 }),
    "/api/cities/by-state/{stateId}": {
      get: {
        tags: ["Cities"], summary: "Cities of one state, for the dropdown (public)",
        parameters: [{ name: "stateId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: ok, 400: bad },
      },
    },
    ...masterPaths("Localities", "/api/localities", { name: "Anna Nagar", cityId: 1 }),
    "/api/localities/by-city/{cityId}": {
      get: {
        tags: ["Localities"], summary: "Localities of one city, for the dropdown (public)",
        parameters: [{ name: "cityId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: ok, 400: bad },
      },
    },
    ...masterPaths("Property Types", "/api/property-types", { name: "Apartment" }),
    ...masterPaths("Amenities", "/api/amenities", { name: "Parking" }),

    // ================= USERS (admin) =================
    "/api/users": {
      get: {
        tags: ["Users"], summary: "List users (admin)", security: login,
        responses: { 200: ok, 401: noLogin, 403: noPermission },
      },
      post: {
        tags: ["Users"], summary: "Create user (admin). Normal sign-up is /api/auth/register", security: login,
        requestBody: jsonBody({ name: "Priya", email: "priya@test.com", phone: "9000000000", password: "secret123" }),
        responses: { 201: created, 400: bad, 401: noLogin, 403: noPermission, 409: conflict },
      },
    },
    "/api/users/{id}": {
      get: {
        tags: ["Users"], summary: "Get user (admin)", security: login, parameters: [idParam],
        responses: { 200: ok, 401: noLogin, 403: noPermission, 404: notFound },
      },
      put: {
        tags: ["Users"], summary: "Update user (admin)", security: login, parameters: [idParam],
        requestBody: jsonBody({ name: "Priya S", phone: "9000000001" }),
        responses: { 200: ok, 400: bad, 401: noLogin, 403: noPermission, 404: notFound },
      },
      delete: {
        tags: ["Users"], summary: "Delete user and all their data (admin)", security: login, parameters: [idParam],
        responses: { 200: ok, 401: noLogin, 403: noPermission, 404: notFound },
      },
    },
  },
};

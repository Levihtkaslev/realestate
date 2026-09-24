-- CreateIndex
CREATE INDEX "properties_listing_type_status_city_id_price_id_idx" ON "properties"("listing_type", "status", "city_id", "price", "id");

-- CreateIndex
CREATE INDEX "properties_listing_type_status_city_id_created_at_id_idx" ON "properties"("listing_type", "status", "city_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "properties_listing_type_status_price_id_idx" ON "properties"("listing_type", "status", "price", "id");

-- CreateIndex
CREATE INDEX "properties_listing_type_status_created_at_id_idx" ON "properties"("listing_type", "status", "created_at", "id");

-- CreateIndex
CREATE INDEX "properties_locality_id_idx" ON "properties"("locality_id");

-- CreateIndex
CREATE INDEX "properties_property_type_id_idx" ON "properties"("property_type_id");

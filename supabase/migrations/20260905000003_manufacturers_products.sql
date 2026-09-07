-- =============================================================================
-- Migration 003: Manufacturers & Products
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 002_roles_users
-- Schema source: docs/04_DATABASE_DESIGN.md §3 (manufacturers, products)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: manufacturers
-- Canonical legal entity that produces or packs products.
-- -----------------------------------------------------------------------------
create table public.manufacturers (
  id               uuid        not null default gen_random_uuid(),
  legal_name       text        not null,
  aliases          text[]      not null default '{}',
  contact_metadata jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint manufacturers_pkey primary key (id),
  constraint manufacturers_legal_name_nonempty check (char_length(trim(legal_name)) > 0)
);

comment on table public.manufacturers is
  'Legal entities (manufacturers, packers, importers) associated with inspected products. '
  'contact_metadata is a flexible jsonb payload for non-sensitive business contact information.';

comment on column public.manufacturers.legal_name is
  'The canonical/legal name as it appears on official registration. '
  'Used for cross-source comparison with package declarations.';

comment on column public.manufacturers.aliases is
  'Alternative names/abbreviations used in search and matching. '
  'Example: ["Hindustan Unilever", "HUL"]';

comment on column public.manufacturers.contact_metadata is
  'Non-sensitive business metadata: address, registered office, website. '
  'Must not store aadhaar, PAN, or other personally sensitive identifiers.';

-- Index: legal name search
create index idx_manufacturers_legal_name on public.manufacturers(legal_name);

-- Trigger: auto-update updated_at
create trigger manufacturers_updated_at
  before update on public.manufacturers
  for each row execute function public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Table: products
-- Canonical product identity. One product can be inspected many times.
-- -----------------------------------------------------------------------------
create table public.products (
  id              uuid        not null default gen_random_uuid(),
  manufacturer_id uuid        not null,
  name            text        not null,
  category        text        not null,
  package_type    text,
  metadata        jsonb       not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint products_pkey primary key (id),
  constraint products_manufacturer_fk foreign key (manufacturer_id)
    references public.manufacturers(id) on delete restrict on update cascade,
  constraint products_name_nonempty check (char_length(trim(name)) > 0),
  constraint products_category_nonempty check (char_length(trim(category)) > 0),
  constraint products_package_type_valid check (
    package_type is null or package_type in (
      'BOTTLE', 'BOX', 'POUCH', 'CAN', 'JAR', 'WRAPPER',
      'BLISTER_PACK', 'CARTON', 'TUBE', 'OTHER'
    )
  )
);

comment on table public.products is
  'Canonical product records. A product belongs to one manufacturer and may be inspected many times. '
  'metadata is a flexible jsonb payload for product-specific attributes (dimensions, net quantity, category-specific fields).';

comment on column public.products.category is
  'Product commodity category. Aligned with CommodityCategory enum in shared-types. '
  'Values: FOOD_BEVERAGE, PERSONAL_CARE_COSMETICS, CLEANING_HOUSEHOLD, PHARMACEUTICAL_HEALTHCARE, '
  'ELECTRONICS_APPLIANCES, TEXTILE_APPAREL, COMMODITY_GRAINS_PULSES_OILS, OTHER.';

comment on column public.products.package_type is
  'Physical package format. Aligned with PackagingType enum in shared-types.';

-- Index: name search
create index idx_products_name on public.products(name);

-- Index: category filter
create index idx_products_category on public.products(category);

-- Index: manufacturer lookup
create index idx_products_manufacturer on public.products(manufacturer_id);

-- Trigger: auto-update updated_at
create trigger products_updated_at
  before update on public.products
  for each row execute function public.update_updated_at_column();

-- Facility Management relationships
-- Ensures floors / robots / profiles are linked to a facility (tenant root).
-- Safe to re-run: only adds columns / FKs when missing.

-- Tenant root (create only if it does not already exist).
create table if not exists facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_at timestamptz default now()
);

-- Floors belong to a facility.
alter table floors
  add column if not exists facility_id uuid;

alter table floors
  add constraint if not exists floors_facility_fk
  foreign key (facility_id) references facilities (id) on delete cascade;

-- Robots belong to a facility.
alter table robots
  add column if not exists facility_id uuid;

alter table robots
  add constraint if not exists robots_facility_fk
  foreign key (facility_id) references facilities (id) on delete set null;

-- Profiles already carry facility_id (auth module); ensure the FK exists.
alter table profiles
  add column if not exists facility_id uuid;

alter table profiles
  add constraint if not exists profiles_facility_fk
  foreign key (facility_id) references facilities (id) on delete set null;

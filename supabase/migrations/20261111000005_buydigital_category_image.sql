-- Optional uploaded picture for a category (falls back to the chosen icon when empty)
alter table buydigital.categories add column if not exists image_path text;

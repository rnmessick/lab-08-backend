DROP TABLE IF EXISTS weathers;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS events;

--this.search_query = locationName;
--this.formatted_query = result.body.results[0].formatted_address;
--this.latitude = result.body.results[0].geometry.location.lat;
--this.longitude = result.body.results[0].geometry.location.lng;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude Numeric(10, 7),
  longitude Numeric(10,7)
);

CREATE TABLE weathers (
  id SERIAL PRIMARY KEY,
  forecast VARCHAR(255),
  formatted_query VARCHAR(255),
  time VARCHAR(255)
  -- location_id INTEGER,
  -- FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  link VARCHAR(255),
  name VARCHAR(255),
  event_date VARCHAR(255),
  summary VARCHAR(255)
);
-- this.link
-- = link;
--   this.name = name;
--   this.event_date = new Date
-- (event_date).toDateString
-- ();
--   this.summary = summary;

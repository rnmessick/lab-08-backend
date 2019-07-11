// APP dependencies
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pg = require('pg');
// Global variables
const PORT = process.env.PORT;
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', error => {
  console.error('Ohh oh spagetti-o: ', error);
});

const GEOCODE_API_KEY = process.env.GEOCODE_API_KEY;
const DARKSKY_API_KEY = process.env.DARKSKY_API_KEY;
const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// Construct server with dependency objects
const app = express();

app.use(cors());
const superagent = require('superagent');

//DB SETUP

// Use express to get location data
app.get('/location', searchToLatLng);

// Performs task of building object from JSON file
function searchToLatLng(request, response) {
  const locationName = request.query.data;
  const geocodeURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${locationName}&key=${GEOCODE_API_KEY}`;
  client
    .query(
      `SELECT * FROM locations
            WHERE search_query =$1`,
      [locationName]
    )
    .then(sqlRes => {
      if (sqlRes.rowCount === 0) {
        console.log('from web');
        superagent
          .get(geocodeURL)
          .then(result => {
            let location = new LocationConstructor(result.body);
            location.search_query = locationName;
            client.query(
              `INSERT INTO locations(search_query,formatted_query, latitude, longitude)
               VALUES($1,$2,$3,$4)`,
              [
                location.search_query,
                location.formatted_query,
                location.latitude,
                location.longitude
              ]
            );
            response.send(location);
          })
          .catch(error => {
            console.error(error);
            response.status(500).send('Status 500: Life is hard mang.');
          });
      } else {
        response.send(sqlRes.rows[0]);
      }
    });
}
function dbLookup(query, searchQuery, targetTable, userReq, callback) {
  client
    .query(
      `SELECT * FROM ${targetTable}
                Where ${searchQuery}=$1`,
      [query]
    )
    .then(sqlRes => callback(sqlRes, userReq));
}
// constructor function to build weather objects
function LocationConstructor(geoData) {
  this.formatted_query = geoData.results[0].formatted_address;
  this.latitude = geoData.results[0].geometry.location.lat;
  this.longitude = geoData.results[0].geometry.location.lng;
}
// Use express to get weather data
app.get('/weather', searchWeather);

function searchWeather(request, response) {
  const darkskyURL = `https://api.darksky.net/forecast/${DARKSKY_API_KEY}/${
    request.query.data.latitude
  },${request.query.data.longitude}`;
  let userReq = request.query.data;
  dbLookup(
    request.query.data.formatted_query,
    'formatted_query',
    'weathers',
    userReq,
    (sqlRes, userReq) => {
      console.log(sqlRes);
      if (sqlRes.rowCount === 0) {
        superagent
          .get(darkskyURL)
          .then(result => {
            let weathers = result.body.daily.data.map(
              element => new WeatherConstructor(element)
            );
            client.query(
              `INSERT INTO weathers(forecast, formatted_query, time)
               VALUES($1,$2,$3)`,
              [weathers[0].forecast, userReq.formatted_query, weathers[0].time]
            );
            response.send(weathers);
          })
          .catch(error => {
            console.error(error);
            response.status(500).send('Status 500: Life is hard mang.');
          });
      } else {
        response.send(sqlRes);
      }
    }
  );
}

// constructor function to build weather objects
function WeatherConstructor(element) {
  (this.forecast = element.summary),
  (this.time = new Date(element.time * 1000).toDateString());
}

//Search Eventbrite

app.get('/events', searchEventbrite);

function searchEventbrite(request, response) {
  let userReq = request.query.data;

  dbLookup(
    request.query.data.formatted_query,
    'formatted_query',
    'weathers',
    userReq,
    (sqlRes, userReq) => {
      const eventBriteURL = `https://www.eventbriteapi.com/v3/events/search/?location.longitude=${
        userReq.longitude
      }&location.latitude=${
        userReq.latitude
      }&expand=venue&token=${EVENTBRITE_API_KEY}`;
      superagent
        .get(eventBriteURL)
        .then(result => {
          let eventData = result.body.events.map(event => {
            new EventConstructor(
              event.url,
              event.name.text,
              event.start.local,
              event.summary
            );
            client.query(
              `INSERT INTO events(link, name, event_date, summary)
                          VALUES($1,$2,$3,$4)`,
              [event.url, event.name, event.start, event.summary]
            );
          });
          response.send(eventData);
        })
        .catch(error => {
          console.error(error);
          response
            .status(500)
            .send('Status 500: Sadly, Events are not working');
        });
    }
  );
}

function EventConstructor(link, name, event_date, summary) {
  this.link = link;
  this.name = name;
  this.event_date = new Date(event_date).toDateString();
  this.summary = summary;
}

// error handling
app.use('*', (request, response) => {
  response.send('you got to the wrong place');
});

// Start the server
app.listen(PORT, () => {
  console.log(`app is up on port ${PORT}`);
});

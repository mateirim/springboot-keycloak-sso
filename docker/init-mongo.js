// Runs inside app_db on first container start.
// Creates the app user and seeds demo location data.
db = db.getSiblingDB('app_db');

db.createCollection('locations');
db.createCollection('favourites');

db.createUser({
  user: 'appuser',
  pwd: 'changeme',
  roles: [{ role: 'readWrite', db: 'app_db' }]
});

db.locations.insertMany([
  { name: 'Eiffel Tower',         description: 'Iconic iron lattice tower on the Champ de Mars.',    category: 'landmark',  lat: 48.8584,   lng: 2.2945   },
  { name: 'Colosseum',            description: 'Ancient amphitheatre in the centre of Rome.',         category: 'landmark',  lat: 41.8902,   lng: 12.4922  },
  { name: 'Sagrada Família',      description: 'Unfinished basilica designed by Antoni Gaudí.',       category: 'landmark',  lat: 41.4036,   lng: 2.1744   },
  { name: 'Acropolis of Athens',  description: 'Ancient citadel above the city of Athens.',           category: 'landmark',  lat: 37.9715,   lng: 23.7257  },
  { name: 'Brandenburg Gate',     description: '18th-century neoclassical monument in Berlin.',       category: 'landmark',  lat: 52.5163,   lng: 13.3777  },
  { name: 'Schönbrunn Palace',    description: 'Former imperial summer residence in Vienna.',         category: 'landmark',  lat: 48.1845,   lng: 16.3122  },
  { name: 'Charles Bridge',       description: 'Medieval stone bridge across the Vltava in Prague.',  category: 'landmark',  lat: 50.0865,   lng: 14.4114  },
  { name: 'Anne Frank House',     description: 'Historic house and biographical museum in Amsterdam.',category: 'museum',    lat: 52.3752,   lng: 4.8839   },
  { name: 'Louvre Museum',        description: 'World\'s largest art museum, home of the Mona Lisa.', category: 'museum',    lat: 48.8606,   lng: 2.3376   },
  { name: 'Rijksmuseum',          description: 'Dutch national museum of arts and history.',          category: 'museum',    lat: 52.3600,   lng: 4.8852   },
  { name: 'Prado Museum',         description: 'Spain\'s national art museum in Madrid.',             category: 'museum',    lat: 40.4138,   lng: -3.6921  },
  { name: 'Uffizi Gallery',       description: 'Art museum in Florence with Renaissance masterworks.',category: 'museum',    lat: 43.7677,   lng: 11.2551  },
  { name: 'Matera',               description: 'Ancient cave city in southern Italy — Sassi di Matera.',category: 'nature', lat: 40.6664,   lng: 16.6043  },
  { name: 'Plitvice Lakes',       description: 'Cascading lakes and waterfalls in Croatia.',          category: 'nature',    lat: 44.8654,   lng: 15.5820  },
  { name: 'Meteora',              description: 'Rock formations topped with Orthodox monasteries.',    category: 'nature',    lat: 39.7217,   lng: 21.6306  },
  { name: 'Cinque Terre',         description: 'Five colourful fishing villages on the Italian Riviera.',category: 'nature', lat: 44.1461,   lng: 9.6439   },
  { name: 'Hallstatt',            description: 'Picturesque village on the shore of Lake Hallstatt.', category: 'nature',    lat: 47.5622,   lng: 13.6493  },
  { name: 'Keukenhof Gardens',    description: 'World\'s largest flower garden near Lisse.',          category: 'nature',    lat: 52.2698,   lng: 4.5469   },
  { name: 'Patagonia',            description: 'Vast wilderness at the southern tip of South America.',category: 'nature',   lat: -50.9423,  lng: -72.9853 },
  { name: 'Banff National Park',  description: 'Rocky Mountain park with turquoise glacial lakes.',   category: 'nature',    lat: 51.4968,   lng: -115.9281},
  { name: 'Kyoto',                description: 'Former imperial capital with over 1600 Buddhist temples.',category: 'city', lat: 35.0116,   lng: 135.7681 },
  { name: 'Dubrovnik Old Town',   description: 'Walled medieval city on the Adriatic coast.',         category: 'city',      lat: 42.6507,   lng: 18.0944  },
  { name: 'Porto Ribeira',        description: 'Historic riverside district of Porto.',                category: 'city',      lat: 41.1401,   lng: -8.6148  },
  { name: 'Budapest Fisherman\'s Bastion', description: 'Terrace with panoramic views over the Danube.',category: 'city',  lat: 47.5021,   lng: 19.0343  },
  { name: 'Marrakech Medina',     description: 'Labyrinthine old city with souks and riads.',         category: 'city',      lat: 31.6295,   lng: -7.9811  }
]);

// Runs inside app_db on first container start.
// Creates the app user and initializes collections.
db = db.getSiblingDB('app_db');

db.createCollection('users');

db.createUser({
  user: 'appuser',
  pwd: 'changeme',
  roles: [{ role: 'readWrite', db: 'app_db' }]
});

console.log('MongoDB initialized for Spring Boot Keycloak SSO app.');

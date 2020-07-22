# Express Jobs

A full featured API backend to a job board site using Node + express + PostgreSQL.

## Getting Started

### Prerequisites

```
Node.js (v11+)
npm
PostgreSQL (v10.5+)
```

### Installing

After cloning this repository:

```
npm install
```

```
createdb jobly
```

```
psql jobly < data.sql
```

```
npm start
```

## Running the tests

```
createdb jobly-test-users
createdb jobly-test-jobs
createdb jobly-test-companies
psql jobly-test-users < data.sql
psql jobly-test-jobs < data.sql
psql jobly-test-companiess < data.sql
```

```
npm test
```

## Built With

- [Node.js](https://nodejs.org/en/) - The JavaScript runtime
- [Express.js](https://expressjs.com/) - The web framework
- [PostgreSQL](https://maven.apache.org/) - The relational database
- [Jest](https://jestjs.io/) - Testing framework

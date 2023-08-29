# Introduction
The application acts as a convenient virtual library where users can keep track of their ongoing book reading. It allows users to easily add the books they are currently reading, update their progress by noting the current page, and share their personal reviews. To make book management even more enjoyable, the application integrates with an external API to automatically fetch book covers based on the book titles provided. With these features, users can stay organized and engaged in their reading adventures.

The application runs multiple services using Docker and Docker Compose; a **Node.js application, MySQL, PHPMyAdmin and Redis**. The Node.js application runs on port 4000, while MySQL runs on port 8989, PHPMyAdmin on port 8080 and Redis on port 6379. These ports are mapped to your local machine, so you can access PHPMyAdmin's graphical interface by visiting localhost://8080.

*you can change the ports in the docker files **(if you'd like)***

## Note
This application now requires Firebase integration using a service account. To access the application's full functionality, you need to possess the necessary credentials.
The "Getting Started" process involves configuring Firebase by creating a directory named "keys," within which the service account JSON file is stored under the name "service_account_key.json."

## Project Structure 
- migrations - migration files to create or change database structure
- lib/app.js - starter file to create the server and main point of the application
- lib/workflow/index.js - main application middleware
- lib/workflow/schema.js - schema to validate incoming requests
- lib/models - database models to directly access database tables
- lib/utils - utilities for handling errors and accessibility options to application
- tests - integration tests for models and API.

## Getting started

The main Node.js module of this application is located in `/lib/app.js`. To ensure the correct configuration of Knex, the application also imports a config.js file that must be created beforehand.

1. Edit the `.env` file to include the values for the environmental variables. For example 
```
MYSQL_HOST = library-mysql # has to be the same name as the mysql docker container
MYSQL_USER = root
MYSQL_PASSWORD = root
MYSQL_DATABASE = library
MYSQL_PORT = 3306 # mysql's docker container port is 3306
MYSQL_ROOT_PASSWORD = root
```

2. Create a `config.js` file in the base of the app's directory
```
import fs from 'fs'

const fbConfigPath = './keys/service_account_key.json'

const config = {
  port: process.env.PORT || 4000,
  mysql: {
    host:  process.env.MYSQL_HOST || "library-mysql",
    database:  process.env.MYSQL_DATABASE || "library",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "root", 
  },
  firebase: {
    serviceAccount: (fs.existsSync(fbConfigPath) ? fbConfigPath : JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  },
  redis: {
    url: process.env.REDIS_URL || "redis://redis:6379",
    socket: {
      host: process.env.REDIS_HOST || "redis",
      port: process.env.REDIS_PORT || 6379,
    },
    password: process.env.REDIS_PASSWORD
  }

}

export { config }
```

3. Run the `docker-compose` build command.  Or `docker compose` depending on your version of docker compose (**NOTE: The node_modules directory is installed within the application's Docker container. Any new packages that are installed are added to the package.json file, and then the Docker-compose build command is run again)**
```bash
#!/bin/bash
docker-compose up --build
```
# Running tests
In order to run the tests in `tests` directory, you have to bash into the node application's docker container. Example 
```bash
#!/bin/bash
docker-compose docker exec -it library_backend bash
```
then
```bash
#!/bin/bash
npm run test
```

## API Documentation

### 1. Health Check
Check the health of the API.

- **Endpoint:** `/v1/health`
- **Method:** GET
- **Response:**
  - **Status Code:** 200 OK
  - **Content:** "OK"

### 2. Get User's Books
Retrieve a list of books owned by a specific user.

- **Endpoint:** `/v1/users/:id/books`
- **Method:** GET
- **Authentication:** Firebase authentication required
- **URL Parameters:**
  - `id` (string): User ID
- **Response:**
  - **Status Code:** 200 OK
  - **Content:**
    ```json
    {
      "results": [
        // Array of book objects
      ],
      "status": 200
    }
    ```

### 3. Add Book to User's Collection
Add a new book to a specific user's collection.

- **Endpoint:** `/v1/users/:id/books`
- **Method:** POST
- **Authentication:** Firebase authentication required
- **URL Parameters:**
  - `id` (string): User ID
- **Request Body:**
  ```json
  {
    // Book details
  }
  ```
- **Response:**
  - **Status Code:** 200 OK
  - **Content:**
    ```json
    {
      "results": {
        // Added book object
      },
      "status": 200
    }
    ```

### 4. Delete Book from User's Collection
Delete a book from a specific user's collection.

- **Endpoint:** `/v1/users/:id/books`
- **Method:** DELETE
- **Authentication:** Firebase authentication required
- **URL Parameters:**
  - `id` (string): User ID
- **Request Body:**
  ```json
  {
    "bookId": "xyz123" // ID of the book to delete
  }
  ```
- **Response:**
  - **Status Code:** 200 OK
  - **Content:**
    ```json
    {
      "results": {
        // Deleted book object
      },
      "status": 200
    }
    ```

### 5. Update Book in User's Collection
Update details of a book in a specific user's collection.

- **Endpoint:** `/v1/users/:id/books`
- **Method:** PATCH
- **Authentication:** Firebase authentication required
- **URL Parameters:**
  - `id` (string): User ID
- **Request Body:**
  ```json
  {
    "bookId": "xyz123", // ID of the book to update
    // Updated book details
  }
  ```
- **Response:**
  - **Status Code:** 200 OK
  - **Content:**
    ```json
    {
      "results": {
        // Updated book object
      },
      "status": 200
    }
    ```

Please note that the authentication middleware provided by `this.authMiddleware.authenticate()` suggests that Firebase authentication is being used. You might need to make sure that Firebase authentication is properly integrated into your application for these endpoints to work as intended.

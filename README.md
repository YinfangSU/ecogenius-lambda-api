# EcoGenius Lambda API

EcoGenius Lambda API is a backend service designed to support project EcoGenius by TP12. It provides endpoints for managing posts, uploading images, analyzing content using AI, and more. This API is built with Node.js and integrates PostgreSQL, Cloudinary, and OpenAI for robust functionality.

## Features

- **Post Management**: Create, retrieve, and manage posts with metadata.
- **Image Upload**: Upload images to Cloudinary with support for base64 and URL inputs.
- **AI Analysis**: Analyze images and text using OpenAI's GPT models.
- **Database Integration**: Uses PostgreSQL for reliable data storage.
- **Error Handling**: Comprehensive error handling for robust API responses.

## Prerequisites

Before setting up the project, ensure you have the following installed:

- Node.js (v16 or higher)
- PostgreSQL
- A Cloudinary account
- An OpenAI API key

## Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/YinfangSU/ecogenius-lambda-api.git
   cd ecogenius-community-api
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the root directory and configure the following variables:
   ```env
   DB_HOST=your_database_host
   DB_USER=your_database_user
   DB_PASS=your_database_password
   DB_NAME=your_database_name
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Run the Application**:
   ```bash
   npm start
   ```

## API Endpoints

### 1. Upload Image
- **POST** `/upload`
- Request Body:
  ```json
  {
    "file": "base64_or_url"
  }
  ```
- Response:
  ```json
  {
    "secure_url": "https://...",
    "public_id": "..."
  }
  ```

### 2. Get Posts
- **GET** `/posts`
- Response:
  ```json
  [
    {
      "id": 1,
      "title": "Post Title",
      "body": "Post Body",
      "created_at": "2025-10-16T00:00:00Z"
    }
  ]
  ```

### 3. Create Post
- **POST** `/posts`
- Request Body:
  ```json
  {
    "author_id": 1,
    "title": "New Post",
    "body": "Post content",
    "category": "General"
  }
  ```

### 4. Analyze Content
- **POST** `/analyze`
- Request Body:
  ```json
  {
    "prompt": "Analyze this text",
    "file_urls": ["https://example.com/image.jpg"]
  }
  ```
- Response:
  ```json
  {
    "analysis": "AI-generated analysis"
  }
  ```

## Contribution

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes with clear messages.
4. Submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For questions or support, please contact [YinfangSU](https://github.com/YinfangSU).
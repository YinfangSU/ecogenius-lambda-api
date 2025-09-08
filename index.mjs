import { Pool } from "pg";
import cloudinary from "cloudinary";

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

// configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ========= Update upload image logic =========
async function uploadImage(event) {
  try {
    const body = JSON.parse(event.body);
    const file = body.file; // base64 or URL

    const result = await cloudinary.v2.uploader.upload(file, {
      folder: "items", // store to Cloudinary items/ folder
    });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result), // including secure_url, public_id 等
    };
  } catch (err) {
    console.error("Upload error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}

// handle posts list
async function getPosts() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, title, body, category, status, condition, location, tags, image_url, created_at FROM posts ORDER BY created_at DESC LIMIT 20"
    );
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result.rows),
    };
  } finally {
    client.release();
  }
}

// create post
async function createPost(event) {
  const client = await pool.connect();
  try {
    const body = JSON.parse(event.body);
    const result = await client.query(
      `INSERT INTO posts (author_id, title, body, category, status, condition, location, tags, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        body.author_id,
        body.title,
        body.body,
        body.category,
        body.status || null,
        body.condition || null,
        body.location,
        body.tags || null,
        body.image_url || null,
      ]
    );
    return {
      statusCode: 201,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result.rows[0]),
    };
  } finally {
    client.release();
  }
}

// get post detail
async function getPostDetail(postId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT * FROM posts WHERE id = $1",
      [postId]
    );
    if (result.rows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };
    }
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result.rows[0]),
    };
  } finally {
    client.release();
  }
}

// create response
async function createResponse(event) {
  const client = await pool.connect();
  try {
    const body = JSON.parse(event.body);
    const result = await client.query(
      `INSERT INTO responses (post_id, author_id, message)
       VALUES ($1,$2,$3) RETURNING *`,
      [body.post_id, body.author_id, body.message]
    );
    return {
      statusCode: 201,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result.rows[0]),
    };
  } finally {
    client.release();
  }
}

// main handler
export const handler = async (event) => {
  console.log("Incoming event:", event);

  const { httpMethod, path, pathParameters } = event;

  try {
    if (httpMethod === "POST" && path.endsWith("/upload")) {
      return await uploadImage(event);
    } else if (httpMethod === "GET" && path.endsWith ("/posts")) {
      return await getPosts();
    } else if (httpMethod === "POST" && path.endsWith ("/posts")) {
      return await createPost(event);
    } else if (httpMethod === "GET" && path.startsWith("/posts/")) {
      const postId = path.split("/")[2];
      return await getPostDetail(postId);
    } else if (httpMethod === "POST" && path.endsWith ("/responses")) {
      return await createResponse(event);
    }

    return { statusCode: 404, body: JSON.stringify({ error: "Not Found" }) };
  } catch (err) {
    console.error("Lambda error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server Error" }) };
  }
};

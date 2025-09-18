// Import PostgreSQL connection pool
import { Pool } from "pg";
// Import Cloudinary for image upload
import cloudinary from "cloudinary";
// Import OpenAI SDK for AI analysis
import OpenAI from "openai";

// Configure PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

// Configure OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Lambda environment variable
});

// Call OpenAI API to analyze image and text
async function analyzeImage(event) {
  const body = JSON.parse(event.body);
  const { prompt, file_urls } = body;

  console.log("AnalyzeImage called with:", { prompt, file_urls });

  // Build basic chat messages
  const messages = [
    {
      role: "user",
      content: [{ type: "text", text: prompt }],
    },
  ];

  // If there is an image, add image URL to the message
  if (file_urls && file_urls.length > 0) {
    messages[0].content.push({
      type: "image_url",
      image_url: { url: file_urls[0], detail: "high" },
    });
  }

  // Call OpenAI chat.completions API
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
  });

  let content = response.choices[0].message.content;
  console.log("OpenAI raw response:", JSON.stringify(response, null, 2));

  // If the response starts with a code block, remove markdown wrappers
  if (content.startsWith("```")) {
    content = content
      .replace(/```json\n?/, "")
      .replace(/```$/, "")
      .trim();
  }

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: content,
  };
}

// Configure Cloudinary for image upload
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
    const folder = body.folder || "items"; // Use provided folder or default to "items"

    const result = await cloudinary.v2.uploader.upload(file, {
      folder, // dynamically set folder
    });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result), // including secure_url, public_id etc.
    };
  } catch (err) {
    console.error("Upload error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}

// Get the latest 20 posts
async function getPosts() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, title, description, image_url, street_name, suburb, postcode, category, nickname, created_at
      FROM posts
      ORDER BY created_at DESC
      LIMIT 20`
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

// Create a new post
async function createPost(event) {
  const client = await pool.connect();
  try {
    const body = JSON.parse(event.body);
    const result = await client.query(
      `INSERT INTO posts (title, description, image_url, street_name, suburb, postcode, category, nickname)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
   RETURNING *`,
      [
        body.title,
        body.description || null,
        body.image_url || null,
        body.street_name,
        body.suburb || null,
        body.postcode || null,
        body.category || null,
        body.nickname,
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
      `SELECT id, title, description, image_url, street_name, suburb, postcode, category, nickname, created_at
   FROM posts WHERE id = $1`,
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

// Create a response to a post
async function createResponse(event) {
  const client = await pool.connect();
  try {
    const body = JSON.parse(event.body);
    const result = await client.query(
      `INSERT INTO responses (post_id, nickname, content)
   VALUES ($1,$2,$3)
   RETURNING *`,
      [body.post_id, body.nickname, body.content]
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

// Get responses by postId
async function getResponsesByPostId(postId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, post_id, nickname, content, created_at
       FROM responses
       WHERE post_id = $1
       ORDER BY created_at ASC`,
      [postId]
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

// Lambda main entry, route to different handlers
export const handler = async (event) => {
  console.log("Incoming event:", event);

  const { httpMethod, rawPath, routeKey } = event;

  try {
    if (routeKey === "POST /upload") {
      // Upload image
      return await uploadImage(event);
    } else if (routeKey === "GET /posts") {
      // Get posts list
      return await getPosts();
    } else if (routeKey === "POST /posts") {
      // Create new post
      return await createPost(event);
    } else if (routeKey === "GET /posts/{id}") {
      // Get post detail
      const postId = event.pathParameters?.id;
      return await getPostDetail(postId);
    } else if (routeKey === "POST /responses") {
      // Create response
      return await createResponse(event);
    } else if (routeKey === "POST /analyze") {
      // AI analyze image and text
      return await analyzeImage(event);
    } else if (routeKey === "GET /posts/{id}/responses") {
      // Get responses by postId
      const postId = event.pathParameters?.id;
      return await getResponsesByPostId(postId);
    }

    // Route not matched, return 404
    return { statusCode: 404, body: JSON.stringify({ error: "Not Found" }) };
  } catch (err) {
    console.error("Lambda error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server Error" }) };
  }
};

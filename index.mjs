import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

// 处理帖子列表
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

// 创建帖子
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

// 获取单个帖子详情
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

// 回复帖子
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

// 主处理函数
export const handler = async (event) => {
  console.log("Incoming event:", event);

  const { httpMethod, path, pathParameters } = event;

  try {
    if (httpMethod === "GET" && path === "/posts") {
      return await getPosts();
    } else if (httpMethod === "POST" && path === "/posts") {
      return await createPost(event);
    } else if (httpMethod === "GET" && path.startsWith("/posts/")) {
      const postId = path.split("/")[2];
      return await getPostDetail(postId);
    } else if (httpMethod === "POST" && path === "/responses") {
      return await createResponse(event);
    }

    return { statusCode: 404, body: JSON.stringify({ error: "Not Found" }) };
  } catch (err) {
    console.error("Lambda error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server Error" }) };
  }
};

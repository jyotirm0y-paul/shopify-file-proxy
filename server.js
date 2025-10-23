// server.js
import express from "express";
import fetch from "node-fetch";
import multer from "multer";
import cors from "cors";

const app = express();
const upload = multer();

// CORS: allow requests from your store (optional: change to your store domain)
app.use(cors({
  origin: true
}));

// environment variables (set these on Render)
const SHOPIFY_STORE = process.env.jyotirmooy.myshopify.com; // e.g. "mystore.myshopify.com"
const SHOPIFY_ADMIN_TOKEN = process.env.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; // shpat_...

if (!SHOPIFY_STORE || !SHOPIFY_ADMIN_TOKEN) {
  console.error("Missing SHOPIFY_STORE or SHOPIFY_ADMIN_TOKEN env variables");
  process.exit(1);
}

// optional simple secret to prevent others from using this endpoint
const SHARED_SECRET = process.env.SHARED_SECRET || '';

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // optional secret check - frontend can send header X-Proxy-Secret
    if (SHARED_SECRET) {
      const header = req.header("X-Proxy-Secret") || "";
      if (header !== SHARED_SECRET) {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file provided" });
    }

    // Prepare the GraphQL mutation to create a file
    const query = `
      mutation fileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files {
            preview {
              image {
                url
              }
            }
            url
            alt
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const base64 = req.file.buffer.toString("base64");
    const originalSource = `data:${req.file.mimetype};base64,${base64}`;

    const variables = {
      files: [
        {
          originalSource,
          contentType: req.file.mimetype,
          alt: req.file.originalname
        }
      ]
    };

    const response = await fetch(`https://${SHOPIFY_STORE}/admin/api/2023-07/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN
      },
      body: JSON.stringify({ query, variables })
    });

    const json = await response.json();

    if (json.errors || json.data?.fileCreate?.userErrors?.length) {
      return res.status(400).json({
        success: false,
        error: json.errors || json.data.fileCreate.userErrors
      });
    }

    // Prefer the safe URL location; some responses include preview.image.url
    const fileObj = json.data.fileCreate.files[0];
    const fileUrl = fileObj?.preview?.image?.url || fileObj?.url;

    return res.json({ success: true, url: fileUrl });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));



export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb', // max file size
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, type, base64 } = req.body; // data sent from Shopify theme

    if (!name || !type || !base64) {
      return res.status(400).json({ error: "Missing file data" });
    }

    const SHOPIFY_STORE = process.env.jyotirmooy.myshopify.com; // e.g. mystore.myshopify.com
    const SHOPIFY_ADMIN_TOKEN = process.env.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; // shpat_...

    const query = `
      mutation fileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files {
            preview {
              image { url }
            }
            url
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      files: [
        {
          originalSource: `data:${type};base64,${base64}`,
          contentType: type,
          alt: name,
        },
      ],
    };

    const response = await fetch(`https://${SHOPIFY_STORE}/admin/api/2023-07/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json();

    if (json.data?.fileCreate?.userErrors?.length) {
      return res.status(400).json({ error: json.data.fileCreate.userErrors });
    }

    const fileObj = json.data.fileCreate.files[0];
    const fileUrl = fileObj?.preview?.image?.url || fileObj?.url;

    return res.status(200).json({ success: true, url: fileUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const prisma = new PrismaClient();

async function generateCover() {
  const storyId = "cmoekm20w0001bzqsbr10p9r1";
  const apiKey = process.env.AI_IMAGE_API_KEY;
  const model = process.env.AI_IMAGE_MODEL;
  const baseUrl = process.env.AI_IMAGE_BASE_URL;

  const story = await prisma.story.findUnique({ where: { id: storyId } });
  console.log("Story:", story.title, story.genre, story.era);

  const endpoint = baseUrl.replace(/\/+$/, "") + "/images/generations";
  const prompt = "Book cover illustration, epic fantasy style, Genshin Impact Zhongli character, no text, cinematic lighting, masterpiece quality.";

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({ model, prompt, n: 1, size: "1024x1024", response_format: "b64_json" }),
  });

  console.log("Status:", resp.status);
  const json = await resp.json();
  const imageData = json.data && json.data[0];
  console.log("Has b64_json:", Boolean(imageData && imageData.b64_json));
  console.log("Has url:", Boolean(imageData && imageData.url));

  if (imageData && imageData.url) {
    console.log("Downloading image...");
    const imgResp = await fetch(imageData.url);
    const buffer = Buffer.from(await imgResp.arrayBuffer());
    console.log("Image size:", buffer.length);

    const cacheDir = path.join(process.cwd(), "public", "generated-images");
    if (fs.existsSync(cacheDir) === false) fs.mkdirSync(cacheDir, { recursive: true });
    const filename = "cover_" + storyId + "_" + Date.now() + ".png";
    fs.writeFileSync(path.join(cacheDir, filename), buffer);
    const imageUrl = "/generated-images/" + filename;

    await prisma.story.update({ where: { id: storyId }, data: { coverImageUrl: imageUrl } });
    console.log("SUCCESS! Cover saved:", imageUrl);
  } else if (imageData && imageData.b64_json) {
    console.log("Saving b64 image...");
    const buffer = Buffer.from(imageData.b64_json, "base64");
    const cacheDir = path.join(process.cwd(), "public", "generated-images");
    if (fs.existsSync(cacheDir) === false) fs.mkdirSync(cacheDir, { recursive: true });
    const filename = "cover_" + storyId + "_" + Date.now() + ".png";
    fs.writeFileSync(path.join(cacheDir, filename), buffer);
    const imageUrl = "/generated-images/" + filename;
    await prisma.story.update({ where: { id: storyId }, data: { coverImageUrl: imageUrl } });
    console.log("SUCCESS! Cover saved:", imageUrl);
  } else {
    console.log("No image data returned");
  }

  await prisma.$disconnect();
}
generateCover().catch(e => { console.error("ERROR:", e.message); process.exit(1); });

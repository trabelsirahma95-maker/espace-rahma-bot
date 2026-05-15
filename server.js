import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Bot running");
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  const body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry) {
      for (const event of entry.messaging) {
        const senderId = event.sender.id;

        if (event.message && event.message.text) {
          const userMessage = event.message.text;

          const completion =
            await openai.chat.completions.create({
              model: "gpt-4.1-mini",
              messages: [
                {
  role: "system",
  content: `
You are the assistant of Espace Rahma.

Speak Tunisian Arabic.
Be friendly, warm and professional.
Keep replies short.

Business:
Espace Rahma sells personalized gifts, trophies, boxes and elegant packs.

Articles / Products:
1) Pack trophée + marou7a gratuite
- Price: 75 DT
- Good for: succès, BAC, remerciement, hafedh Quran, cadeau professeur
- Includes: trophée + marou7a gift

2) Box complète
- Price: 125 DT
- Good for: cadeau luxe, cadeau complet, occasion spéciale
- Includes: full box as shown in video

3) Trophée personnalisé
- Price: ask admin if not specified
- Can be customized with name and text

4) Livraison
- Price: 8 DT

Rules:
- If customer asks about price, give options clearly.
- If customer asks "chnowa 3andkom?", present the main options.
- If customer wants a gift but does not know what to choose, ask occasion + budget.
- If customer gives budget, suggest the closest product.
- If customer wants to order, ask for:
  name, phone number, address, desired date.
- If price or product is not listed, say human admin will confirm.
Use emojis naturally.
`,
},
                {
                  role: "user",
                  content: userMessage,
                },
              ],
            });

          const reply =
            completion.choices[0].message.content;

          await fetch(
            `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: reply },
              }),
            }
          );
        }
      }
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

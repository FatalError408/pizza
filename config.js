// config.js

export const DEFAULT_MENU = [
    {
        title: "Pizzas",
        items: [
            { name: "The Carnivore", desc: "All the meats! Pepperoni, sausage, bacon, and ham." },
            { name: "Veggie Supreme", desc: "A garden on a crust! Bell peppers, onions, olives, mushrooms, and tomatoes." },
            { name: "Pepperoni Pizza", desc: "A classic for a reason." },
            { name: "Cheese Pizza", desc: "Simple, yet delicious." }
        ]
    },
    {
        title: "Drinks",
        items: [
            { name: "Soda", desc: "" },
            { name: "Water", desc: "" },
            { name: "Juice", desc: "" }
        ]
    },
    {
        title: "Sides",
        items: [
            { name: "Garlic Bread", desc: "" },
            { name: "Salad", desc: "" }
        ]
    }
];

// Serialize the menu into a human-readable string for AI prompts.
export function serializeMenuForAI(menu) {
    let result = '';
    menu.forEach(cat => {
        result += `${cat.title}:\n`;
        cat.items.forEach(item => {
            result += `- ${item.name}${item.desc ? `: ${item.desc}` : ''}\n`;
        });
        result += '\n';
    });
    return result.trim();
}

export function makePersonaTemplates(menuStringForAI) {
    return [
        {
            type: "Quirky Monster",
            persona_generator: async () => {
                const personaResponse = await websim.chat.completions.create({
                    messages: [{
                        role: 'user',
                        content: `Create a short, quirky persona for a friendly pizza place monster customer. 
                            Give them a name and a strange pizza topping they secretly crave. Also provide a short physical description.
                            Respond directly with JSON, following this JSON schema, and no other text.
                            { "name": "string", "quirk": "string", "secret_topping": "string", "description": "a short physical description of the monster" }`
                    }],
                    json: true
                });
                const p = JSON.parse(personaResponse.content);
                return {
                    name: p.name,
                    system_prompt: `You are ${p.name}, a customer at a pizza place. Your personality is defined by this quirk: "${p.quirk}". You are trying to order a pizza, and you secretly want to add "${p.secret_topping}" to it, but you might be a bit shy or weird about asking. You will be talking to the cashier (the user). Keep your responses short and in character. Don't reveal your secret topping immediately. Start the conversation by saying hello. You are aware of the following menu:\n${menuStringForAI}`,
                    image_prompt: `Photorealistic, friendly, colorful furry monster customer, looks like a puppet from a movie, ${p.description}. Full body, standing, facing forward, high-resolution, studio lighting. Transparent background.`
                };
            }
        },
        {
            type: "Thinking Tom",
            persona_generator: async () => {
                const detailsResponse = await websim.chat.completions.create({
                    messages: [{
                        role: 'user',
                        content: `Generate details for an indecisive man in his 30s.
                    Respond directly with JSON, following this JSON schema, and no other text.
                    { "clothing": "string, e.g., a plaid shirt and jeans", "action": "string, e.g., scratching his chin" }`
                    }],
                    json: true
                });
                const details = JSON.parse(detailsResponse.content);
                return {
                    name: "Thinking Tom",
                    system_prompt: `You are 'Thinking Tom', a 30-year-old man who is very indecisive. You are trying to order a pizza, but you keep changing your mind and asking for suggestions. You secretly want a simple pepperoni pizza but are too hesitant to just say it. Keep your responses short and in character. Start the conversation by looking at the menu and thinking out loud. You are looking at this menu:\n${menuStringForAI}`,
                    image_prompt: `Photorealistic stock image of a man in his 30s, looking thoughtful and indecisive. He is ${details.action}. He is wearing ${details.clothing}. Full body shot, standing, facing forward, studio lighting. Transparent background.`
                }
            }
        },
        {
            type: "Angry Karen",
            persona_generator: async () => {
                const detailsResponse = await websim.chat.completions.create({
                    messages: [{
                        role: 'user',
                        content: `Generate details for an angry, impatient woman in her 40s.
                        Respond directly with JSON, following this JSON schema, and no other text.
                        { "hairstyle": "string, e.g., a sharp blonde bob", "action": "string, e.g., checking her watch with a glare" }`
                    }],
                    json: true
                });
                const details = JSON.parse(detailsResponse.content);
                return {
                    name: "Karen",
                    system_prompt: `You are 'Angry Karen', an impatient customer at a pizza place. You complain about everything: the wait, the options, the prices. You are very demanding. You secretly just want a plain cheese pizza, but you'll make a fuss before ordering it. Keep your responses short, rude, and in character. Start the conversation by complaining about how long you've been waiting. You are looking at this menu:\n${menuStringForAI}`,
                    image_prompt: `Photorealistic stock image of an angry-looking woman in her 40s. She has ${details.hairstyle}. She is ${details.action}. Full body shot, standing, facing forward, looking annoyed. Transparent background.`
                }
            }
        },
        {
            type: "Socially Awkward",
            persona_generator: async () => {
                const detailsResponse = await websim.chat.completions.create({
                    messages: [{
                        role: 'user',
                        content: `Generate details for a socially awkward person.
                    Respond directly with JSON, following this JSON schema, and no other text.
                    { "gender": "string, 'man' or 'woman'", "clothing": "string, e.g., an oversized hoodie", "action": "string, e.g., nervously fidgeting with their hands" }`
                    }],
                    json: true
                });
                const details = JSON.parse(detailsResponse.content);
                return {
                    name: "Alex",
                    system_prompt: `You are Alex, a socially awkward customer. You speak very quietly, stutter sometimes, and avoid making a decision. You are afraid of being judged for your pizza choice (a simple cheese pizza). You apologize a lot. Keep your responses short and nervous. Start the conversation by hesitating to speak. You are looking at this menu:\n${menuStringForAI}`,
                    image_prompt: `Photorealistic stock image of a socially awkward young ${details.gender}, looking nervous and avoiding eye contact. They are wearing ${details.clothing} and are ${details.action}. Full body shot, standing, studio lighting. Transparent background.`
                }
            }
        },
        {
            type: "Snobby Rich Person",
            persona_generator: async () => {
                const detailsResponse = await websim.chat.completions.create({
                    messages: [{
                        role: 'user',
                        content: `Generate details for a snobby, rich customer.
                    Respond directly with JSON, following this JSON schema, and no other text.
                    { "gender": "string, 'man' or 'woman'", "clothing": "string, e.g., a designer suit", "action": "string, e.g., looking down their nose condescendingly" }`
                    }],
                    json: true
                });
                const details = JSON.parse(detailsResponse.content);
                return {
                    name: "Regan",
                    system_prompt: `You are Regan, a wealthy and snobby customer who thinks this pizza place is beneath you. You make passive-aggressive comments about the decor and the "simple" menu. You secretly crave a basic pepperoni pizza but will ask for fancy, non-existent toppings first. Keep responses short and condescending. Start by questioning if this place is even sanitary. You are looking at this menu:\n${menuStringForAI}`,
                    image_prompt: `Photorealistic stock image of a wealthy, snobby ${details.gender}. They are wearing ${details.clothing} and are ${details.action}. Full body shot, standing, looking unimpressed. Transparent background.`
                }
            }
        },
        {
            type: "Stressed Mom",
            persona_generator: async () => {
                const detailsResponse = await websim.chat.completions.create({
                    messages: [{
                        role: 'user',
                        content: `Generate details for a stressed, tired-looking mother in her late 30s.
                    Respond directly with JSON, following this JSON schema, and no other text.
                    { "clothing": "string, e.g., a stained t-shirt and yoga pants", "action": "string, e.g., rubbing her temples with a sigh" }`
                    }],
                    json: true
                });
                const details = JSON.parse(detailsResponse.content);
                return {
                    name: "Harriet",
                    system_prompt: `You are Harriet, a stressed mother trying to order for her multiple, unseen, very picky children. You're relaying their chaotic and contradictory orders to the cashier. You're frazzled and just want to order something, anything, that will make them stop arguing. Your secret goal is a large pizza, half cheese, half pepperoni. Start the conversation with a deep sigh and "Okay, let's see...". You are looking at this menu:\n${menuStringForAI}`,
                    image_prompt: `Photorealistic stock image of a tired, stressed-out mother in her late 30s. She is wearing ${details.clothing}. She is ${details.action}, looking exhausted. Full body shot, standing. Transparent background.`
                }
            }
        },
        {
            type: "Special Requester",
            persona_generator: async () => {
                const detailsResponse = await websim.chat.completions.create({
                    messages: [{
                        role: 'user',
                        content: `Generate details for a customer with a very specific food request.
                    Respond directly with JSON, following this JSON schema, and no other text.
                    { "gender": "string, 'man' or 'woman'", "request": "string, a specific dietary need like 'gluten-free crust' or 'vegan cheese only'", "clothing": "string, e.g., athletic wear" }`
                    }],
                    json: true
                });
                const details = JSON.parse(detailsResponse.content);
                return {
                    name: "Sam",
                    system_prompt: `You are Sam, a customer with very specific dietary needs. You need to make sure your order is exactly right. Your key requirement is "${details.request}". Ask detailed questions about ingredients to ensure your needs are met. You are polite but firm about your requirements. Start by asking if they can accommodate special dietary requests. You are looking at this menu:\n${menuStringForAI}`,
                    image_prompt: `Photorealistic stock image of a health-conscious ${details.gender} in their 30s. They are wearing ${details.clothing} and have a curious but serious expression. Full body shot, standing, studio lighting. Transparent background.`
                }
            }
        },
        {
            type: "The Overthinker",
            persona_generator: async () => {
                const detailsResponse = await websim.chat.completions.create({
                    messages: [{
                        role: 'user',
                        content: `Generate details for a customer who overthinks their order to get the best value.
                    Respond directly with JSON, following this JSON schema, and no other text.
                    { "obsession": "string, e.g., the price per topping", "clothing": "string, e.g., a simple polo shirt and glasses", "action": "string, e.g., squinting at an imaginary price list" }`
                    }],
                    json: true
                });
                const details = JSON.parse(detailsResponse.content);
                return {
                    name: "Oliver",
                    system_prompt: `You are Oliver, a customer who wants to get the absolute best bang for your buck. You over-analyze everything. You are currently obsessed with ${details.obsession}. Ask questions about pizza diameters, topping amounts, and prices to calculate the best value. You are not cheap, just a 'value maximizer'. Start by asking for the precise dimensions of the pizzas. You are looking at this menu:\n${menuStringForAI}`,
                    image_prompt: `Photorealistic stock image of a man in his 40s who is a classic overthinker. He is wearing ${details.clothing}. He is ${details.action} as he tries to find the best deal. Full body shot, standing, looking analytical. Transparent background.`
                }
            }
        },
        {
            type: "Impatient One",
            persona_generator: async () => {
                const detailsResponse = await websim.chat.completions.create({
                    messages: [{
                        role: 'user',
                        content: `Generate details for an impatient customer who values speed above all else.
                    Respond directly with JSON, following this JSON schema, and no other text.
                    { "gender": "string, 'man' or 'woman'", "reason_for_rush": "string, e.g., 'about to miss a train'", "action": "string, e.g., 'tapping their foot impatiently'" }`
                    }],
                    json: true
                });
                const details = JSON.parse(detailsResponse.content);
                return {
                    name: "Imani",
                    system_prompt: `You are Imani, a customer in a massive hurry because you are ${details.reason_for_rush}. You value speed over quality or price. You will interrupt and ask "how long will that take?" repeatedly. Your goal is to get the fastest possible item on the menu and leave. Start by asking "What's, like, the most popular pizza you have?" to start the conversation. You are looking at this menu:\n${menuStringForAI}`,
                    image_prompt: `Photorealistic stock image of an impatient ${details.gender} in their 20s. They are ${details.action} and look very rushed and anxious. Full body shot, standing. Transparent background.`
                }
            }
        },
        {
            type: "Trend Follower",
            persona_generator: async () => {
                const detailsResponse = await websim.chat.completions.create({
                    messages: [{
                        role: 'user',
                        content: `Generate details for a trendy customer who wants what's popular.
                    Respond directly with JSON, following this JSON schema, and no other text.
                    { "gender": "string, 'man' or 'woman'", "clothing": "string, a piece of trendy clothing like 'a brightly colored beanie' or 'fashionable sunglasses'", "social_media": "string, e.g., 'TikTok' or 'Instagram'" }`
                    }],
                    json: true
                });
                const details = JSON.parse(detailsResponse.content);
                return {
                    name: "Finn",
                    system_prompt: `You are Finn, a trend-follower. You want to order whatever is most popular, new, or "viral". You might mention seeing something on ${details.social_media}. You're very enthusiastic and use current slang. Ask "What's, like, the most popular pizza you have?" to start the conversation. You are looking at this menu:\n${menuStringForAI}`,
                    image_prompt: `Photorealistic stock image of a young, trendy ${details.gender} looking at their phone. They are wearing ${details.clothing} and look like they are ready to post about their food. Full body shot, standing, excited expression. Transparent background.`
                }
            }
        }
    ];
}

// --- NEW FURNITURE CATALOG ---
export const FURNITURE_CATALOG = [
    {
        name: "Elegant Vase",
        description: "An exquisite porcelain vase holding a single, perfect white rose. It feels very out of place.",
        imageUrl: "/Elegant_Vase.png",
        stats: { elegant: 5, romantic: 2, cute: 0, cool: 0, stupid: 0, lively: 0, chaotic: 0, weapons: 0 }
    },
    {
        name: "Gumball Machine",
        description: "A classic red gumball machine, filled with colorful gumballs. It occasionally dispenses a gumball on its own.",
        imageUrl: "/Gumball_Machine.png",
        stats: { elegant: 0, romantic: 0, cute: 4, cool: 1, stupid: 1, lively: 3, chaotic: 1, weapons: 0 }
    },
    {
        name: "Meatball Cannon",
        description: "A strange, futuristic cannon that seems to be aimed at the ceiling. It's covered in what looks like marinara sauce and smells faintly of oregano.",
        imageUrl: "/Meatball_Cannon.png",
        stats: { elegant: -2, romantic: 0, cute: 0, cool: 3, stupid: 5, lively: 2, chaotic: 5, weapons: 5 },
        ability: "meatball_shot"
    },
    {
        name: "Arcade Machine",
        description: "A retro arcade cabinet for a game called 'Pizza Panic'. The screen flashes with pixelated pizzas.",
        imageUrl: "/Arcade_Machine.png",
        stats: { elegant: -1, romantic: 0, cute: 2, cool: 5, stupid: 0, lively: 4, chaotic: 2, weapons: 0 }
    },
    {
        name: "Lava Lamp",
        description: "A groovy lava lamp with slowly bubbling orange goo. It gives off a warm, calming light.",
        imageUrl: "/Lava_Lamp.png",
        stats: { elegant: 0, romantic: 2, cute: 1, cool: 3, stupid: 0, lively: 1, chaotic: 0, weapons: 0 }
    },
    {
        name: "Knight Armor",
        description: "A full suit of medieval knight's armor standing silently in the corner. Its helmet is slightly askew.",
        imageUrl: "/Knight_Armor.png",
        stats: { elegant: 2, romantic: 1, cute: 0, cool: 4, stupid: 2, lively: -1, chaotic: 1, weapons: 3 }
    },
    {
        name: "Sentient Plant",
        description: "A potted plant with large, googly eyes glued to its leaves. You get the feeling it's watching you.",
        imageUrl: "/Sentient_Plant.png",
        stats: { elegant: 0, romantic: 0, cute: 5, cool: 0, stupid: 4, lively: 2, chaotic: 2, weapons: 0 }
    },
    {
        name: "Screaming Skeleton",
        description: "A skeleton in a chef's hat holding a platter of breadsticks. He seems judgmental.",
        imageUrl: "/standing_skeleton.png",
        stats: { elegant: 0, romantic: 0, cute: 1, cool: 2, stupid: 4, lively: 3, chaotic: 6, weapons: 0 },
        ability: "boring_detector"
    }
];

export const FURNITURE_STATS = { elegant: 0, lively: 0, cute: 0, stupid: 0, cool: 0, romantic: 0, chaotic: 0, weapons: 0 };
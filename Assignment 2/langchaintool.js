import dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";

dotenv.config({ path: new URL("../.env", import.meta.url), quiet: true });

const multiply = tool(
    ({ a, b }) => {
        console.log(`  [multiply tool] called with a=${a}, b=${b}`);
        return String(a * b);
    },
    {
        name: "multiply",
        description: "Multiply two numbers together and return the product.",
        schema: z.object({
        a: z.number().describe("The first number"),
        b: z.number().describe("The second number"),
    }),
  }
);



const WEATHER_CODES = {
    0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
    45: "fog", 48: "freezing fog", 51: "light drizzle", 53: "drizzle",
    55: "heavy drizzle", 61: "light rain", 63: "rain", 65: "heavy rain",
    71: "light snow", 73: "snow", 75: "heavy snow", 80: "rain showers",
    81: "heavy rain showers", 82: "violent rain showers", 95: "thunderstorm",
};


const getWeather = tool(
    async ({ city, country_code }) => {
        console.log(`  [get_weather tool] called with city="${city}", country_code="${country_code ?? "none"}"`);

        let geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
        if (country_code) geoUrl += `&countryCode=${country_code}`;
        const geo = await (await fetch(geoUrl)).json();

        if (!geo.results?.length) {
            return `Could not find a location named "${city}".`;
        }
        const { latitude, longitude, name, admin1, country } = geo.results[0];

        const wxUrl =
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
            `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
            `&temperature_unit=fahrenheit&wind_speed_unit=mph`;
        const wx = await (await fetch(wxUrl)).json();
        const c = wx.current;

        return JSON.stringify({
            location: [name, admin1, country].filter(Boolean).join(", "),
            conditions: WEATHER_CODES[c.weather_code] ?? `weather code ${c.weather_code}`,
            temperature_f: c.temperature_2m,
            feels_like_f: c.apparent_temperature,
            humidity_percent: c.relative_humidity_2m,
            wind_mph: c.wind_speed_10m,
            observed_at: c.time,
        });
  },
  {
    name: "get_weather",
    description: "Get the current weather for a city. Returns temperature (F), conditions, humidity, and wind.",
    schema: z.object({
      city: z.string().describe("City name only, e.g. 'Santa Cruz' (no state or country)"),
      country_code: z
        .string()
        .optional()
        .describe("Optional ISO 3166-1 alpha-2 country code to disambiguate, e.g. 'US'"),
    }),
  }
);


const tools = [multiply, getWeather];
const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));

const llm = new ChatOpenAI({
    model: "openrouter:z-ai/glm-5.3-flash",
    apiKey: process.env.BAYLEAF_API_KEY,
    temperature: 0,
    configuration: {
        baseURL: "https://api.bayleaf.dev/v1",
  },
});
const llmWithTools = llm.bindTools(tools);


async function chat(prompt) {
    console.log(`\nUser: ${prompt}`);
    const messages = [new HumanMessage(prompt)];

    let response = await llmWithTools.invoke(messages);

  while (response.tool_calls?.length) {
    messages.push(response);
    for (const toolCall of response.tool_calls) {
        console.log(`  LLM requested tool: ${toolCall.name}`, toolCall.args);
        const toolMessage = await toolsByName[toolCall.name].invoke(toolCall);
        messages.push(toolMessage);
    }
    response = await llmWithTools.invoke(messages);
  }

    console.log(`AI: ${response.content}`);
}

console.log("===== Example 1: Multiply tool =========");
await chat("What is 15 multiplied by 23?");

console.log("\n===== Example 2: Weather tool ============");
await chat("What's the weather like right now in Santa Cruz, California?");

console.log("\n====== Example 3: Both tools chained ============");
await chat("Get the current temperature in San Leandro, California(Where I am from), then multiply it by 3.");

console.log("\n========= Example 4: No tool needed =========");
await chat("Tell me a fun fact about octopuses.");
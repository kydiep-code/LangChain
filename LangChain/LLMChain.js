import 'dotenv/config';
import { ChatOpenAI } from "@langchain/openai"; 

const model = await new ChatOpenAI({
    model: "openrouter:z-ai/glm-5.3-flash",
    apiKey: process.env.BAYLEAF_API_KEY,
    configuration: {baseURL: "https://api.bayleaf.dev/v1"}
});
/*
const response = await model.invoke("Which is better, chunky or creamy peanut butter?");
console.log(response.content);
*/
// Step 6 Chaining LLM calls
/*
const step1 = await model.invoke("List the top chess opening for white and black")

const step2 = await model.invoke(
    `These are the opening for chess go into detail for one opening of white and black "${step1.content}".
    Also add bullet points strengths and weaknesses of the openeings.
    `
)

console.log("List of Chess Oppenings:", step1.content)
console.log("Opennings to play:", step2.content)
*/


// Step 7


/*
// Step 1: Ask the model to plan the task
const planResponse = await model.invoke(
    `You are a helpful assistant. A user wants to write a short children's story.
     Produce a JSON array of 3-5 story steps. Respond ONLY with valid JSON,
     no explanation. Example format:
     ["Introduce the main character", "Describe the problem", ...]`
);

// Step 2: Parse the plan
const steps = JSON.parse(planResponse.content);
console.log("Plan:", steps);

// Step 3: Execute each step
const results = [];
for (const step of steps) {
    const result = await model.invoke(
        `Write one paragraph for this part of a children's story: ${step}`
    );
    results.push(result.content);
}

// Step 4: Combine into a final result
console.log("\nFull story:\n", results.join("\n\n"));
*/

// Step 8 

const planResponse = await model.invoke(
    `You are a Professional Chef. A user wants to make a amazing dinner including Appetizer, main dish, and dessert, but 
    you are on a budget of $30 and you dont want to waste any ingrediants so have intertwining ingrediants
    Produce a JSON Array of 3 steps each being the dishes. Respond only wiht valid JSON,
    no explanaiton. Example Forat:
    ["Appetizer : Dish Name, Ingreidatns", "Main Dish .....]
    `
);

const steps = JSON.parse(planResponse.content)
console.log("/--------------------------------------------------------------/\nList of Dishes: \n", steps)

const results = []

for (const x of steps){
    const instructions = await model.invoke(
        `
        Using the ingredients listed give a step by step guide to create the dish ${x}
        `
    )
    results.push(instructions.content)
}

const shoppinglist = await model.invoke(
    `
    Here are the Three recipes for the meal:
    ${results.join()}
    Create a combined shopping List have the output look like
    Ex: 
    2 Cloves Garlic $6
    1 Salmon Fillet $10
    etc
    `
)
console.log("/--------------------------------------------------------------/\n Shopping List: \n", shoppinglist.content)
console.log("/--------------------------------------------------------------/\n How to make: \n", results.join("\n"))
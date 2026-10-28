import { createInterface } from 'node:readline/promises';
import { ChatGroq } from "@langchain/groq"
import { TavilySearch } from '@langchain/tavily'
import { tool } from '@langchain/core/tools'
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";
import z from 'zod';
import { printGraph } from "./utils.js";




const search = new TavilySearch({
    maxResult: 3,
    topic: 'general',
});

const calendarEvents = tool(
    async ({ query }) => {
        return JSON.stringify([{ meeting: 'Deepak presentation', date: '2026-10-21', time: '10:00 AM' }]);
    },
    {
        name: 'get-calendar-events',
        description: 'get the calendar events',
        schema: z.object({
            query: z.string().describe("The query to use in calendar event search."),
        })
    }
)

const tools = [search, calendarEvents];
const toolNode = new ToolNode(tools)
const llm = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0
}).bindTools(tools)

async function callModel(state) {
    console.log("calling the llm")
    const response = await llm.invoke(state.messages)
    // console.log("response in callmodel:", response)
    return { messages: [response] };
}

function shouldContinue(state) {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage.tool_calls?.length > 0) return "tools";
    return END;
}

const graph = new StateGraph(MessagesAnnotation)
    .addNode("llm", callModel)
    .addNode("tools", toolNode)
    .addEdge(START, "llm")
    .addEdge("tools", "llm")
    .addConditionalEdges("llm", shouldContinue)


const app = graph.compile();

async function main() {
    await printGraph(app, "./customGraph.png");

    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('Chat started. Type "exit" to quit.\n');

    let messages = [];

    while (true) {
        const userInput = await rl.question('You: ');

        if (userInput.trim().toLowerCase() === 'exit') {
            console.log('Goodbye!');
            rl.close();
            break;
        }

        if (!userInput.trim()) continue;

        messages.push({
            role: 'user',
            content: userInput
        });

        const result = await app.invoke({ messages });

        messages = result.messages;
        const finalMessage = messages[messages.length - 1];
        console.log(`\nAssistant: ${finalMessage.content}\n`);
    }
}

main()
import { writeFileSync } from 'fs';
import { createInterface } from 'node:readline/promises';
import { ChatGroq } from "@langchain/groq"
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { TavilySearch } from '@langchain/tavily'
import { tool } from '@langchain/core/tools'
import z from 'zod';
import { MemorySaver } from '@langchain/langgraph';

async function main() {

    const model = new ChatGroq({
        model: "openai/gpt-oss-120b",
        temperature: 0
    })

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
    const checkpointer = new MemorySaver();
    const agent = createReactAgent({
        llm: model,
        tools: [search, calendarEvents],
        checkpointer: checkpointer
    })



    // Save agent graph visualization once on startup
    const drawableGraph = await agent.getGraphAsync();
    const graphImage = await drawableGraph.drawMermaidPng();
    writeFileSync('./graphState.png', new Uint8Array(await graphImage.arrayBuffer()));

    // Initialize conversation with system prompt
    const messages = [
        {
            role: 'system',
            content: 'You are an assistant. Use the provided tools to fetch information and give user-readable output.'
        }
    ];

    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('Chat started. Type "exit" to quit.\n');

    const config = { configurable: { thread_id: "main-thread" } };

    while (true) {
        const userInput = await rl.question('You: ');

        if (userInput.trim().toLowerCase() === 'exit') {
            console.log('Goodbye!');
            rl.close();
            break;
        }

        if (!userInput.trim()) continue;

        // MemorySaver checkpointer manages history — just send the new message
        const result = await agent.invoke(
            { messages: [...messages, { role: 'user', content: userInput }] },
            config
        );

        const assistantMessage = result.messages[result.messages.length - 1];
        console.log(`\nAssistant: ${assistantMessage.content}\n`);
    }
}

main();
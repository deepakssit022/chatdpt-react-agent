import { writeFileSync } from 'fs';
import { ChatGroq } from "@langchain/groq"
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { TavilySearch } from '@langchain/tavily'
import { tool } from '@langchain/core/tools'
import z from 'zod';

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

    const agent = createReactAgent({
        llm: model,
        tools: [search, calendarEvents]
    })

    const result = await agent.invoke({
        messages: [
            {
                role: 'system',
                content: 'You are an assistant. Use the provided tools to fetch information and give user-readable output.'
            },
            {
                role: 'user',
                content: 'do i have any meeting today?'
            }
        ]
    })

    const drawableGraphGraphState = await agent.getGraphAsync();
    const graphStateImage = await drawableGraphGraphState.drawMermaidPng();
    const graphStateArrayBuffer = await graphStateImage.arrayBuffer();

    const filePath = './graphState.png';

    writeFileSync(filePath, new Uint8Array(graphStateArrayBuffer));

    console.log("result===>", result.messages[result.messages.length - 1].content)
}

main();
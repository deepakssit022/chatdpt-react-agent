import { ChatGroq } from "@langchain/groq"
import { TavilySearch } from '@langchain/tavily'
import { tool } from '@langchain/core/tools'
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";
import z from 'zod';




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
    const result = await app.invoke({
        messages: [{
            role: 'user',
            content: "what is the weather in new delhi today?"
        }]
    });
    // console.log("result:", result.messages[result.messages.length - 1].content);
    const messages = result.messages;
    const final = messages[messages.length - 1];
    console.log("final response in main:", final.content);
}

main()
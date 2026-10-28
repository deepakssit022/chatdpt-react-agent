import { writeFileSync } from 'fs';

export async function printGraph(agent, graphPath) {

    // Save agent graph visualization once on startup
    const drawableGraph = await agent.getGraphAsync();
    const graphImage = await drawableGraph.drawMermaidPng();
    writeFileSync(graphPath, new Uint8Array(await graphImage.arrayBuffer()));

}
"use strict";

const fs = require("fs");
const path = require("path");

const xml = fs.readFileSync(path.join(__dirname, "docx_extract", "word", "diagrams", "data1.xml"), "utf8");

const pts = [...xml.matchAll(/<dgm:pt modelId="\{([^}]+)\}"[^>]*>([\s\S]*?)<\/dgm:pt>/g)];
const idToText = {};
for (const m of pts) {
    const id = m[1];
    const inner = m[2];
    const texts = [...inner.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)]
        .map((x) => x[1].trim())
        .filter(Boolean);
    if (texts.length) idToText[id] = texts.join(" ");
}

const cxns = [...xml.matchAll(/<dgm:cxn\b[^>]*\/>/g)]
    .map((m) => {
        const tag = m[0];
        return {
            src: tag.match(/srcId="\{([^}]+)\}"/)?.[1],
            dest: tag.match(/destId="\{([^}]+)\}"/)?.[1],
        };
    })
    .filter((c) => c.src && c.dest);

const labeledEdges = cxns.filter((c) => idToText[c.src] && idToText[c.dest]);
const children = {};
for (const { src, dest } of labeledEdges) {
    if (!children[src]) children[src] = [];
    if (!children[src].includes(dest)) children[src].push(dest);
}

const ministerId = Object.entries(idToText).find(([, t]) => t === "Minister")?.[0];
console.log("Minister id:", ministerId);

function print(id, depth = 0, seen = new Set()) {
    if (seen.has(id)) return;
    seen.add(id);
    console.log(`${"  ".repeat(depth)}- ${idToText[id]}`);
    for (const kid of children[id] || []) print(kid, depth + 1, seen);
}

if (ministerId) print(ministerId);

console.log("\n--- All labeled parent -> child edges ---");
for (const { src, dest } of labeledEdges) {
    console.log(`${idToText[src]} -> ${idToText[dest]}`);
}

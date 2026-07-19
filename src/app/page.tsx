"use client";

import { useState } from "react";

type Part = "A" | "B" | "C";

export default function Home() {
  const [part, setPart] = useState<Part>("C");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");

  async function analyse() {
    const response = await fetch("/api/analyse", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({part, query})
    });
    const data = await response.json();
    setResult(data.answer ?? data.error ?? "No result");
  }

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Australian Intern Pharmacist</p>
        <h1>ORAL EXAM AMH</h1>
        <p>Search a Case ID, page, medicine, or paste a new scenario.</p>
      </section>

      <section className="card">
        <div className="parts">
          {(["A","B","C"] as Part[]).map(value => (
            <button key={value} className={part === value ? "active" : ""} onClick={() => setPart(value)}>
              Part {value}
            </button>
          ))}
        </div>

        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Example: Case ID 2DC70A, page 36, or paste the complete case..."
        />
        <button className="primary" onClick={analyse} disabled={!query.trim()}>
          Analyse case
        </button>
      </section>

      {result && <section className="card result"><h2>Exam answer</h2><pre>{result}</pre></section>}
    </main>
  );
}

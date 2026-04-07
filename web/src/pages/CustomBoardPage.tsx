import React, { useState } from "react";

interface CustomBoardPageProps {
  pendingBoardName: string | null;
  onLoad: (raw: unknown) => void;
  onClear: () => void;
  onBack: () => void;
}

const HOW_TO = `{
  "name": "My Custom Show",
  "round1": [
    {
      "name": "CATEGORY NAME",
      "clues": [
        { "value": 200, "question": "The clue read aloud to players", "answer": "What is X?" },
        { "value": 400, "question": "...", "answer": "..." },
        { "value": 600, "question": "...", "answer": "..." },
        { "value": 800, "question": "...", "answer": "..." },
        { "value": 1000, "question": "...", "answer": "..." }
      ]
    }
  ],
  "round2": [ ... ],
  "finalJeopardy": {
    "category": "Category Name",
    "question": "The final clue read aloud",
    "answer": "What is the answer?"
  }
}`;

const CustomBoardPage: React.FC<CustomBoardPageProps> = ({ pendingBoardName, onLoad, onClear, onBack }) => {
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const [showHowTo, setShowHowTo] = useState(false);

  const closeHowTo = () => setShowHowTo(false);

  const handleLoad = () => {
    setError("");
    if (!json.trim()) return;
    try {
      const parsed = JSON.parse(json);
      if (!parsed.round1 || !Array.isArray(parsed.round1) || parsed.round1.length === 0) {
        setError("Board must have at least one category in \"round1\".");
        return;
      }
      onLoad(parsed);
      setJson("");
    } catch {
      setError("Invalid JSON — check for missing commas, quotes, or brackets.");
    }
  };

  return (
    <div className="custom-board-page">
      <div className="cbp-header">
        <button className="menu-button secondary cbp-back-btn" onClick={onBack}>← BACK</button>
        <h1 className="cbp-title">CUSTOM BOARD</h1>
      </div>

      {pendingBoardName && (
        <div className="cbp-active-banner">
          <span className="cbp-active-label">Active custom board:</span>
          <strong className="cbp-active-name">{pendingBoardName}</strong>
          <button className="cbp-clear-btn" onClick={onClear}>Remove</button>
        </div>
      )}

      <div className="cbp-body">
        <div className="cbp-paste-section">
          <p className="cbp-section-label">Paste your board JSON below, then click Load Board before starting the game.</p>
          <textarea
            className="cbp-textarea"
            value={json}
            onChange={(e) => { setJson(e.target.value); setError(""); }}
            placeholder={HOW_TO}
            rows={14}
            spellCheck={false}
          />
          {error && <p className="cbp-error">{error}</p>}
          <div className="cbp-actions">
            <button className="menu-button" onClick={handleLoad} disabled={!json.trim()}>
              LOAD BOARD
            </button>
          </div>
        </div>

        <div className="cbp-howto-section">
          <button className="cbp-howto-toggle" onClick={() => setShowHowTo(true)}>
            ? Format Guide
          </button>
        </div>

        {showHowTo && (
          <div className="htp-overlay" onClick={closeHowTo}>
            <div className="htp-modal" onClick={(e) => e.stopPropagation()}>
              <button className="htp-close-btn" onClick={closeHowTo}>✕</button>
              <h1 className="htp-title">CUSTOM BOARD FORMAT</h1>
              <div className="htp-content">

                <div className="htp-section">
                  <h2>OVERVIEW</h2>
                  <p>A custom board is a JSON object you write ahead of time. Paste it on this screen, click <strong>Load Board</strong>, then start the game. The board will use your categories and clues instead of the built-in catalog.</p>
                </div>

                <div className="htp-section">
                  <h2>JEOPARDY FORMAT</h2>
                  <p><strong>question</strong> — the clue the host reads aloud (a statement or description, e.g. "This is the largest planet in our solar system").</p>
                  <p><strong>answer</strong> — what players respond with (e.g. "What is Jupiter?").</p>
                </div>

                <div className="htp-section">
                  <h2>TOP-LEVEL FIELDS</h2>
                  <ul>
                    <li><code>"name"</code> — optional title shown on the host console</li>
                    <li><code>"round1"</code> — array of up to 6 categories <strong>(required)</strong></li>
                    <li><code>"round2"</code> — array of up to 6 categories (optional; if omitted the host skips straight to Final Jeopardy)</li>
                    <li><code>"finalJeopardy"</code> — optional final round clue object</li>
                  </ul>
                </div>

                <div className="htp-section">
                  <h2>EACH CATEGORY</h2>
                  <ul>
                    <li><code>"name"</code> — label shown on the board (e.g. <code>"THINGS THAT ARE BLUE"</code>)</li>
                    <li><code>"clues"</code> — array of up to 5 clue objects, one per dollar value</li>
                  </ul>
                </div>

                <div className="htp-section">
                  <h2>EACH CLUE</h2>
                  <ul>
                    <li><code>"value"</code> — dollar amount. Round 1: 200/400/600/800/1000. Round 2: 400/800/1200/1600/2000.</li>
                    <li><code>"question"</code> — the clue text read aloud by the host</li>
                    <li><code>"answer"</code> — the correct response players give</li>
                    <li><code>"isDailyDouble": true</code> — optional, marks this clue as the Daily Double</li>
                  </ul>
                </div>

                <div className="htp-section">
                  <h2>FINAL JEOPARDY OBJECT</h2>
                  <ul>
                    <li><code>"category"</code> — the category name shown before wagering</li>
                    <li><code>"question"</code> — the final clue revealed after wagers are in</li>
                    <li><code>"answer"</code> — the correct response</li>
                  </ul>
                </div>

                <div className="htp-section">
                  <h2>TIPS</h2>
                  <ul>
                    <li>You need at least 1 category with at least 1 clue in round1 — that's the only requirement.</li>
                    <li>Categories don't need exactly 5 clues; fewer is fine.</li>
                    <li>The host reveals categories one by one, so players won't see names until revealed.</li>
                    <li>Run your JSON through a validator (e.g. <strong>jsonlint.com</strong>) before pasting to catch typos.</li>
                  </ul>
                </div>

                <div className="htp-section">
                  <h2>FULL EXAMPLE</h2>
                  <pre className="cbp-code-block">{HOW_TO}</pre>
                </div>

              </div>
              <button className="menu-button htp-close-bottom" onClick={closeHowTo}>CLOSE</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomBoardPage;

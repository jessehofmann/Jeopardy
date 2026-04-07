import React from "react";

interface HowToPlayProps {
  onClose: () => void;
}

const HowToPlay: React.FC<HowToPlayProps> = ({ onClose }) => {
  return (
    <div className="htp-overlay" onClick={onClose}>
      <div className="htp-modal" onClick={(e) => e.stopPropagation()}>
        <button className="htp-close-btn" onClick={onClose}>✕</button>
        <h1 className="htp-title">HOW TO PLAY</h1>

        <div className="htp-content">

          <div className="htp-section">
            <h2>SETUP</h2>
            <p>One device (TV or laptop) runs the board — open the game at the URL shown in the room and click <strong>New Game</strong> with a 4-letter room code you choose.</p>
            <p>Everyone else opens the companion app on their phone. The host joins with the same room code using <strong>Join as Host</strong>. Players join with their name using <strong>Join as Player</strong>.</p>
          </div>

          <div className="htp-section">
            <h2>BEFORE THE ROUND STARTS</h2>
            <p>The host reveals categories one by one from the Host Console. The board shows a blank tile until a category is revealed — keeping it a surprise for players.</p>
            <p>Once all categories are revealed, the host picks a clue by selecting a category then a dollar value.</p>
          </div>

          <div className="htp-section">
            <h2>ANSWERING A CLUE</h2>
            <p>The host reads the clue aloud, then taps <strong>Open Buzzers</strong>. Players race to buzz in on their phone. The first to buzz gets to answer.</p>
            <p>Players have 5 seconds (shown as a draining gold border) to answer. The host marks the answer <strong>Correct</strong> or <strong>Incorrect</strong>.</p>
            <ul>
              <li>Correct → player earns the clue value, clue is closed.</li>
              <li>Incorrect → player is locked out for this clue; buzzers re-open for remaining players.</li>
              <li>If time runs out with no buzz → host can skip to the answer.</li>
            </ul>
          </div>

          <div className="htp-section">
            <h2>ROUND 1</h2>
            <p>Six categories, five clues each. Clue values: <strong>$200 · $400 · $600 · $800 · $1,000</strong>.</p>
            <p>One clue is a <strong>Daily Double</strong> — only the player who owns the board (the last correct answerer) can wager any amount up to their score or the round maximum.</p>
          </div>

          <div className="htp-section">
            <h2>ROUND 2 — DOUBLE JEOPARDY</h2>
            <p>Same structure, double the values: <strong>$400 · $800 · $1,200 · $1,600 · $2,000</strong>. Everything else plays the same as Round 1.</p>
          </div>

          <div className="htp-section">
            <h2>FINAL JEOPARDY</h2>
            <p>All players still in the game participate, regardless of score.</p>
            <ol>
              <li>The <strong>category</strong> is revealed. Players submit a private wager (up to their current score) on their phone.</li>
              <li>Once all wagers are in, the host reveals the <strong>question</strong>. Players write their answer on their phone and submit.</li>
              <li>The host reveals each player's answer one at a time and marks it correct or incorrect. Wagers are added or subtracted accordingly.</li>
              <li>Highest score wins!</li>
            </ol>
          </div>

          <div className="htp-section">
            <h2>SCORING</h2>
            <p>Scores are tracked automatically. The host can also manually adjust any player's score by ± the current clue value (or ± $100 between clues) using the score buttons in the Host Console.</p>
            <p>Scores can go negative — don't be afraid to buzz in!</p>
          </div>

          <div className="htp-section">
            <h2>DAILY DOUBLE</h2>
            <p>Hidden randomly in each round. When a Daily Double is selected:</p>
            <ul>
              <li>Only the <strong>board owner</strong> can answer (the last player to answer correctly).</li>
              <li>The host enters the wager — minimum $5, maximum the higher of the player's score or the round top value.</li>
              <li>No buzzing — the board owner answers directly and the host marks correct or incorrect.</li>
            </ul>
          </div>

          <div className="htp-section">
            <h2>CUSTOM BOARDS</h2>
            <p>Want to play with your own categories and clues? Click <strong>Custom Board</strong> on the main menu before starting a game. You can paste a JSON file with your own questions — use the format guide on that screen for details.</p>
          </div>

        </div>

        <button className="menu-button htp-close-bottom" onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
};

export default HowToPlay;

import { useState } from "react";

export function App() {
  const [clicked, setClicked] = useState(false);

  return (
    <main className="hello-page">
      <section className="hello-card" aria-label="Hello button demo">
        <div className="sparkle" aria-hidden="true">
          ✨
        </div>
        <p className="kicker">Simple React UI</p>
        <h1>Hello there</h1>
        <p className="description">
          Tap the button below for a friendly greeting with a smooth, playful style.
        </p>
        <button className="hello-button" type="button" onClick={() => setClicked(true)}>
          {clicked ? "Hello, friend!" : "Say Hello"}
        </button>
        {clicked && <p className="hello-note">Nice to see you here 👋</p>}
      </section>
    </main>
  );
}

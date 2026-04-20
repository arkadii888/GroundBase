import { useState, useRef, useEffect } from "react";
import "./App.css";

interface Message {
  id: number;
  text: string;
  sender: "user" | "drone";
  isError?: boolean;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [telemetry, setTelemetry] = useState({
    voltage: "11.8 V",
    current: "0.4 A",
    status: "STANDBY",
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (command: string) => {
    const textToSend = command.trim();
    if (!textToSend) return;

    const userMsg: Message = {
      id: Date.now(),
      text: textToSend,
      sender: "user",
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const result = await (window as any).api.sendCommand(textToSend);

      const droneMsg: Message = {
        id: Date.now() + 1,
        text: result.success ? result.data : `Error: ${result.error}`,
        sender: "drone",
        isError: !result.success,
      };

      setMessages((prev) => [...prev, droneMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "Critical connection failure",
          sender: "drone",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="chat-section">
        <div className="chat-window">
          {messages.length === 0 && (
            <h2
              style={{ textAlign: "center", color: "#888", marginTop: "40px" }}
            >
              Ground Base Control
            </h2>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`message ${m.sender === "user" ? "user-msg" : "drone-msg"} ${m.isError ? "error-msg" : ""}`}
            >
              {m.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="input-wrapper">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && send(input)}
            placeholder="Enter command..."
            disabled={loading}
          />
          <button
            className="send-btn"
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
          >
            ➤
          </button>
        </div>
      </div>

      <div className="control-panel">
        <div className="controls-top">
          <div className="panel-title">Quick Actions</div>

          <button
            className="control-btn"
            disabled={loading}
            onClick={() => send("takeoff")}
          >
            Takeoff
          </button>

          <button
            className="control-btn"
            disabled={loading}
            onClick={() => send("land")}
          >
            Land
          </button>

          <button
            className="control-btn kill-btn"
            disabled={loading}
            onClick={() => send("#kill")}
          >
            KILL
          </button>
        </div>

        <div className="telemetry-bottom">
          <div className="panel-title">Telemetry</div>

          <div className="telemetry-item">
            <span className="telemetry-label">Status</span>
            <span className="telemetry-value">{telemetry.status}</span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">Voltage</span>
            <span className="telemetry-value">{telemetry.voltage}</span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">Current</span>
            <span className="telemetry-value">{telemetry.current}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

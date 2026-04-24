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
    latitude_deg: "",
    longitude_deg: "",
    absolute_altitude_m: "",
    relative_altitude_m: "",
    voltage_v: "",
    current_battery_a: "",
    remaining_percent: "",
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const updateTelemetry = async () => {
      const result = await (window as any).api.getTelemetry();

      if (result.success) {
        setTelemetry({
          latitude_deg: result.data.latitude_deg.toString(),
          longitude_deg: result.data.longitude_deg.toString(),
          absolute_altitude_m: result.data.absolute_altitude_m.toString(),
          relative_altitude_m: result.data.relative_altitude_m.toString(),
          voltage_v: result.data.voltage_v.toString(),
          current_battery_a: result.data.current_battery_a.toString(),
          remaining_percent: result.data.remaining_percent.toString(),
        });
      }
    };

    const timer = setInterval(updateTelemetry, 1000);
    return () => clearInterval(timer);
  }, []);

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
              Mission Ground Base
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      <div className="control-panel">
        <div className="controls-top">
          <div className="panel-title">Quick Actions</div>

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
            <span className="telemetry-label">Latitude Degree</span>
            <span className="telemetry-value">{telemetry.latitude_deg}</span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">Longitude Degree</span>
            <span className="telemetry-value">{telemetry.longitude_deg}</span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">Absolute Altitude</span>
            <span className="telemetry-value">
              {telemetry.absolute_altitude_m}
            </span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">Relative Altitude</span>
            <span className="telemetry-value">
              {telemetry.relative_altitude_m}
            </span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">Voltage</span>
            <span className="telemetry-value">{telemetry.voltage_v}</span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">Current</span>
            <span className="telemetry-value">
              {telemetry.current_battery_a}
            </span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">Remaining Percent</span>
            <span className="telemetry-value">
              {telemetry.remaining_percent}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

import { useState, useRef, useEffect } from "react";
import "./App.css";

interface Message {
  id: number;
  text: string;
  sender: "user" | "drone";
  isError?: boolean;
  image?: string;
}

const STORAGE_KEY_MESSAGES = "drone_messages";
const STORAGE_KEY_MISSION_STATE = "drone_mission_active";

function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
    return saved ? JSON.parse(saved) : [];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [isMissionActive, setIsMissionActive] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_MISSION_STATE) === "true";
  });

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
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MISSION_STATE, String(isMissionActive));
  }, [isMissionActive]);

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

  useEffect(() => {
    if (!isMissionActive) return;

    let isPolling = true;

    const pollPhoto = async () => {
      if (!isPolling) return;

      try {
        const result = await (window as any).api.sendCommand("#photo");

        if (result.success && result.data) {
          const dataStr = result.data as string;

          if (dataStr.includes("name:") && dataStr.includes("data:")) {
            const dataIndex = dataStr.indexOf("data:");
            let photoData = dataStr.substring(dataIndex + 5).trim();
            photoData = photoData.replace(/";?$/, "").replace(/^"/, "");

            setMessages((prev) => {
              const newMessages = [...prev];
              for (let i = newMessages.length - 1; i >= 0; i--) {
                if (newMessages[i].text.trim() === "Mission in progress") {
                  newMessages[i] = {
                    ...newMessages[i],
                    text: "Person found at ...",
                    image: photoData,
                  };
                  break;
                }
              }
              return newMessages;
            });

            setIsMissionActive(false);
            isPolling = false;
          }
        }
      } catch (err) {
        console.error("Error during polling:", err);
      }
    };

    const intervalId = setInterval(pollPhoto, 1000);

    return () => {
      isPolling = false;
      clearInterval(intervalId);
    };
  }, [isMissionActive]);

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

      if (result.success && result.data.trim() === "Mission in progress") {
        setIsMissionActive(true);
      }

      if (textToSend === "#kill") {
        setIsMissionActive(false);
      }
    } catch (err) {
      console.error(`Critical error:`, err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "Critical connection failure",
          sender: "drone",
          isError: true,
        },
      ]);
      setIsMissionActive(false);
    } finally {
      setLoading(false);
    }
  };

  const clearStorage = () => {
    localStorage.clear();
    setMessages([]);
    setIsMissionActive(false);
  };

  return (
    <div className="app-container">
      <div className="chat-section">
        <div className="chat-window">
          {messages.length === 0 && (
            <h2
              style={{ textAlign: "center", color: "#888", marginTop: "40px" }}
            >
              Ground Base
            </h2>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`message ${m.sender === "user" ? "user-msg" : "drone-msg"} ${m.isError ? "error-msg" : ""}`}
            >
              {m.text.trim() === "Mission in progress" ? (
                <div style={{ display: "inline-flex", alignItems: "center" }}>
                  Mission in progress
                  <span className="typing-dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </div>
              ) : (
                m.text
              )}

              {m.image && (
                <div style={{ marginTop: "12px", textAlign: "center" }}>
                  <img
                    src={
                      m.image.startsWith("data:image")
                        ? m.image
                        : `data:image/jpeg;base64,${m.image}`
                    }
                    alt="Mission result"
                    style={{
                      maxWidth: "100%",
                      borderRadius: "8px",
                      border: "1px solid #333",
                    }}
                  />
                </div>
              )}
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

      <button
        className="clear-storage-btn"
        onClick={clearStorage}
        title="Clear Storage"
      >
        🧹
      </button>
    </div>
  );
}

export default App;

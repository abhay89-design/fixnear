
(function () {
    if (document.getElementById("fixnear-ai-button")) return;

    const style = document.createElement("style");
    style.textContent = `
        #fixnear-ai-button {
            position: fixed; right: 20px; bottom: 20px; z-index: 9999;
            border: 0; border-radius: 30px; padding: 14px 20px;
            background: #1677ff; color: white; font-weight: 700;
            cursor: pointer; box-shadow: 0 5px 20px #0002;
        }
        #fixnear-ai-panel {
            position: fixed; right: 20px; bottom: 82px; z-index: 9999;
            width: min(350px, calc(100vw - 40px)); height: 420px;
            background: white; border: 1px solid #ddd; border-radius: 16px;
            box-shadow: 0 8px 30px #0002; display: none;
            flex-direction: column; overflow: hidden; font-family: Arial, sans-serif;
        }
        #fixnear-ai-header {
            padding: 16px; background: #1677ff; color: white; font-weight: bold;
        }
        #fixnear-ai-messages {
            flex: 1; padding: 12px; overflow-y: auto; color: #222; font-size: 14px;
        }
        .fixnear-ai-message {
            padding: 10px; margin: 8px 0; border-radius: 10px;
            background: #f0f4fa; overflow-wrap: anywhere; white-space: pre-wrap;
        }
        #fixnear-ai-form {
            display: flex; gap: 6px; padding: 10px; border-top: 1px solid #eee;
        }
        #fixnear-ai-input {
            min-width: 0; flex: 1; padding: 10px;
            border: 1px solid #ccc; border-radius: 8px;
        }
        #fixnear-ai-form button {
            border: 0; border-radius: 8px; padding: 10px;
            background: #1677ff; color: white; cursor: pointer;
        }
        #fixnear-ai-form button:disabled { opacity: 0.65; cursor: wait; }
        @media (max-width: 480px) {
            #fixnear-ai-button { right: 14px; bottom: 14px; }
            #fixnear-ai-panel {
                right: 12px; bottom: 72px;
                width: calc(100vw - 24px); height: min(420px, 65vh);
            }
        }
    `;
    document.head.appendChild(style);

    const button = document.createElement("button");
    button.id = "fixnear-ai-button";
    button.type = "button";
    button.textContent = "💬 FixNear AI";

    const panel = document.createElement("section");
    panel.id = "fixnear-ai-panel";

    const header = document.createElement("div");
    header.id = "fixnear-ai-header";
    header.textContent = "FixNear Assistant";

    const messages = document.createElement("div");
    messages.id = "fixnear-ai-messages";
    messages.setAttribute("aria-live", "polite");

    const form = document.createElement("form");
    form.id = "fixnear-ai-form";

    const input = document.createElement("input");
    input.id = "fixnear-ai-input";
    input.type = "text";
    input.placeholder = "Describe your home repair issue...";
    input.maxLength = 500;
    input.required = true;
    input.setAttribute("aria-label", "Describe your repair issue");

    const send = document.createElement("button");
    send.type = "submit";
    send.textContent = "Send";

    function addMessage(text) {
        const message = document.createElement("div");
        message.className = "fixnear-ai-message";
        message.textContent = text;
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
        return message;
    }

    addMessage("Namaste! Main FixNear Assistant hoon. Apni repair problem bataiye.");

    form.append(input, send);
    panel.append(header, messages, form);
    document.body.append(button, panel);

    button.addEventListener("click", function () {
        const opening = panel.style.display !== "flex";
        panel.style.display = opening ? "flex" : "none";
        if (opening) input.focus();
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const issue = input.value.trim();
        if (!issue || send.disabled) return;

        addMessage("You: " + issue);
        input.value = "";

        send.disabled = true;
        send.textContent = "Thinking...";
        const replyMessage = addMessage("FixNear AI is thinking...");

        try {
            const response = await fetch("/api/ai-assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ issue })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.reply || "AI abhi available nahi hai.");
            }

            console.log("AI response received:", data);
            replyMessage.textContent =
                "FixNear AI: " + (data.reply || "Abhi jawab nahi mil paya.");
        } catch (error) {
            console.error("FixNear AI error:", error);
            replyMessage.textContent =
                "FixNear AI: Connection nahi ho paya. Thodi der baad try karein.";
        } finally {
            send.disabled = false;
            send.textContent = "Send";
            input.focus();
        }
    });
})();

import { ChatIcon, RightArrowIcon } from "./IconsSVGs";

// Componente de tarjeta para el asistente virtual
export default function AssistantCard() {
  return (
    <button
      type="button"
      className="glass-card group flex w-full items-center justify-between rounded-2xl px-6 py-5 text-left transition active:scale-[0.97]"
      style={{ background: "rgba(255, 255, 255, 0.25)" }}
    >
      <div className="flex items-center gap-4">
        <div className="rounded-full bg-white/20 p-2">
          <ChatIcon className="h-6 w-6 text-black" />
        </div>
        <div>
          <span className="block text-sm font-medium text-black">
            Asistente Virtual
          </span>
          <span className="block text-xs uppercase tracking-wide text-black/60">
            ¿En qué puedo ayudarte hoy?
          </span>
        </div>
      </div>

      <RightArrowIcon />
    </button>
  );
}

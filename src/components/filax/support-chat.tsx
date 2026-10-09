import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Headphones, X } from "lucide-react";
import { FilaxLogo } from "@/components/filax-logo";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export function SupportChat({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n();
  const language = useRef(lang);
  language.current = lang;
  const input = useRef<HTMLTextAreaElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/public/filax-support",
        body: () => ({ language: language.current }),
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          const headers = new Headers();
          if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
          return headers;
        },
        prepareSendMessagesRequest: ({ messages, body, headers, api }) => ({
          api,
          headers,
          body: {
            ...body,
            messages: messages.map((message) => ({
              ...message,
              parts: message.parts.filter((part) => part.type === "text"),
            })),
          },
        }),
      }),
    [],
  );
  const { messages, sendMessage, status, error, stop } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    if (!busy) input.current?.focus();
  }, [busy]);
  const close = () => {
    void stop();
    onClose();
  };
  return (
    <section
      aria-label={t("Assistant FILAX")}
      className="absolute inset-x-3 bottom-3 top-20 z-20 flex flex-col overflow-hidden rounded-lg border border-border bg-surface soft-shadow sm:inset-x-auto sm:right-5 sm:w-[390px]"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <FilaxLogo height={20} />
          <div>
            <h3 className="text-sm font-bold">{t("Assistant FILAX")}</h3>
            <p className="text-xs text-muted-foreground">{t("Support · Conversation privée")}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("Fermer la discussion")}
          title={t("Fermer la discussion")}
          onClick={close}
        >
          <X />
        </Button>
      </header>
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-5 p-4">
          {messages.length === 0 && (
            <div className="space-y-4 py-3">
              <Headphones className="h-7 w-7 text-brand-green" />
              <p className="text-sm">{t("Bonjour ! Comment puis-je vous aider avec FILAX ?")}</p>
              <div className="flex flex-wrap gap-2">
                {["Connexion par ID", "Vérification KYC", "Compte bloqué"].map((label) => (
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    onClick={() => void sendMessage({ text: t(label) })}
                  >
                    {t(label)}
                  </Button>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t(
                  "Ne partagez jamais vos codes secrets ni vos données de carte. Les messages ne sont pas conservés.",
                )}
              </p>
            </div>
          )}
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent
                className={
                  message.role === "user"
                    ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"
                    : ""
                }
              >
                {message.parts.map((part, index) =>
                  part.type === "text" ? (
                    <MessageResponse key={index}>{part.text}</MessageResponse>
                  ) : part.type === "reasoning" ? (
                    <p key={index} className="text-xs text-muted-foreground">
                      {t("Analyse de votre question…")}
                    </p>
                  ) : null,
                )}
              </MessageContent>
            </Message>
          ))}
          {busy && (
            <div role="status">
              <Shimmer className="text-sm">{t("L’assistant vous répond…")}</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton aria-label={t("Derniers messages")} />
      </Conversation>
      {error && (
        <p role="alert" className="shrink-0 px-4 py-2 text-xs text-destructive">
          {error.message.startsWith("{")
            ? (() => {
                try {
                  return JSON.parse(error.message).error;
                } catch {
                  return t("Impossible de joindre l’assistant.");
                }
              })()
            : error.message}
        </p>
      )}
      <div className="shrink-0 border-t border-border p-3">
        <PromptInput
          onSubmit={async ({ text }) => {
            if (!text.trim() || busy) return;
            await sendMessage({ text });
            input.current?.focus();
          }}
        >
          <PromptInputTextarea
            ref={input}
            autoFocus
            aria-label={t("Votre question")}
            placeholder={t("Votre question…")}
            maxLength={4000}
            className="min-h-14 text-sm"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              status={status}
              onStop={() => void stop()}
              aria-label={t(busy ? "Arrêter" : "Envoyer")}
              title={t(busy ? "Arrêter" : "Envoyer")}
              className="magnetide-tap"
            >
              {!busy && <ArrowUp />}
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </section>
  );
}

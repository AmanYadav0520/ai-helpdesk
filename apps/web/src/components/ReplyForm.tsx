import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { createReplySchema, type CreateReplyInput } from "core/schemas/replies";
import { type Ticket } from "core/constants/ticket";
import { Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../lib/api";
import { isAxiosError } from "axios";

export default function ReplyForm({ ticket }: { ticket: Ticket }) {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { isSubmitting },
  } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
    defaultValues: { ticketId: ticket.id, body: "" },
  });

  const { mutateAsync } = useMutation({
    mutationFn: (data: CreateReplyInput) => api.post("/api/replies", data),
  });

  const { mutateAsync: polishAsync, isPending: isPolishing } = useMutation({
    mutationFn: (body: string) => api.post<{ body: string }>("/api/replies/polish", { body }),
  });

  const onSubmit = async (data: CreateReplyInput) => {
    setError(null);

    try {
      await mutateAsync(data);
    } catch (err) {
      const message = isAxiosError<{ error?: string }>(err)
        ? (err.response?.data.error ?? "Failed to add reply.")
        : "Failed to add reply.";
      setError(message);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["replies", ticket.id] });
    reset({ ticketId: ticket.id, body: "" });
  };

  const onPolish = async () => {
    setError(null);
    const body = getValues("body");
    if (!body.trim()) return;

    try {
      const { data } = await polishAsync(body);
      setValue("body", data.body, { shouldDirty: true, shouldValidate: true });
    } catch (err) {
      const message = isAxiosError<{ error?: string }>(err)
        ? (err.response?.data.error ?? "Failed to polish reply.")
        : "Failed to polish reply.";
      setError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Controller
          name="body"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Textarea
                {...field}
                id={field.name}
                rows={4}
                placeholder="Write a reply..."
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onPolish}
            disabled={isPolishing || isSubmitting}
          >
            <Sparkles />
            {isPolishing ? "Polishing..." : "Polish"}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Reply"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

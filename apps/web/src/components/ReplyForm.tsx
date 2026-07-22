import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { createReplySchema, type CreateReplyInput } from "core/schemas/replies";
import { type Ticket } from "core/constants/ticket";
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
    formState: { isSubmitting },
  } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
    defaultValues: { ticketId: ticket.id, body: "" },
  });

  const { mutateAsync } = useMutation({
    mutationFn: (data: CreateReplyInput) => api.post("/api/replies", data),
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

        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Reply"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

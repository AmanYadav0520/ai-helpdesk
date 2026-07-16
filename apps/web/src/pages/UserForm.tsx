import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "core/schemas/users";
import { Controller, useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "../lib/api";

type EditingUser = {
  id: string;
  name: string;
  email: string;
};

type UserFormProps = {
  user?: EditingUser;
  onSuccess: () => void;
};

export function UserForm({ user, onSuccess }: UserFormProps) {
  const isEdit = !!user;
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CreateUserInput | UpdateUserInput>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "", password: "" },
  });

  const { mutateAsync } = useMutation({
    mutationFn: (data: CreateUserInput | UpdateUserInput) =>
      isEdit ? api.put(`/api/users/${user.id}`, data) : api.post("/api/users", data),
  });

  const onSubmit = async (data: CreateUserInput | UpdateUserInput) => {
    setError(null);

    try {
      await mutateAsync(data);
    } catch (err) {
      const message = isAxiosError<{ error?: string }>(err)
        ? (err.response?.data.error ?? `Failed to ${isEdit ? "save" : "create"} user.`)
        : `Failed to ${isEdit ? "save" : "create"} user.`;
      setError(message);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["users"] });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                {...field}
                id={field.name}
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="email"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Password</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="password"
                autoComplete="off"
                placeholder={isEdit ? "Leave blank to keep current" : undefined}
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
      </FieldGroup>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isEdit
            ? isSubmitting
              ? "Saving..."
              : "Save Changes"
            : isSubmitting
              ? "Creating..."
              : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}

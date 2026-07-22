import { isAxiosError } from "axios";
import { Alert, AlertDescription } from "@/components/ui/alert";

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? fallback;
  }
  return fallback;
}

type ErrorAlertProps = {
  message?: string;
  error?: unknown;
  fallback?: string;
  className?: string;
};

export default function ErrorAlert({
  message,
  error,
  fallback = "Something went wrong",
  className,
}: ErrorAlertProps) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertDescription>
        {message ?? (error !== undefined ? getErrorMessage(error, fallback) : fallback)}
      </AlertDescription>
    </Alert>
  );
}

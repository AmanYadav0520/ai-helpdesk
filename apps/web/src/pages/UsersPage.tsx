import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "../lib/api";
import { UserForm } from "./UserForm";
import { UsersTable } from "./UsersTable";

type EditingUser = {
  id: string;
  name: string;
  email: string;
};

type DeletingUser = {
  id: string;
  name: string;
};

type DialogState = { mode: "create" } | { mode: "edit"; user: EditingUser } | null;

export function UsersPage() {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deletingUser, setDeletingUser] = useState<DeletingUser | null>(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeletingUser(null);
    },
  });

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Users</h1>
        <Button onClick={() => setDialog({ mode: "create" })}>New User</Button>
      </div>

      <UsersTable
        onEdit={(user) => setDialog({ mode: "edit", user })}
        onDelete={(user) => setDeletingUser(user)}
      />

      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "Edit user" : "Create user"}</DialogTitle>
          </DialogHeader>
          <UserForm
            user={dialog?.mode === "edit" ? dialog.user : undefined}
            onSuccess={() => setDialog(null)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingUser !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingUser?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

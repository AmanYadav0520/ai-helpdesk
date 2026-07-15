import { CreateUserDialog } from "./CreateUserDialog";
import { UsersTable } from "./UsersTable";

export function Users() {
  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Users</h1>
        <CreateUserDialog />
      </div>

      <UsersTable />
    </div>
  );
}

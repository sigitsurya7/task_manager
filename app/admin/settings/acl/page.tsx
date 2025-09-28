"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/table";

export default function AclPage() {
  const data = [
    { role: "ADMIN", permissions: "Full access: manage workspace, members, boards, columns, tasks" },
    { role: "MEMBER", permissions: "CRUD tasks, reorder/move; read boards/columns" },
    { role: "VIEWER", permissions: "Read-only; no create/update/delete/reorder" },
  ];
  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Access Control (ACL)</h1>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-default-600 mb-4">Role-based access control per Workspace.</p>
          <Table aria-label="ACL roles" removeWrapper>
            <TableHeader>
              <TableColumn>Role</TableColumn>
              <TableColumn>Permissions</TableColumn>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.role}>
                  <TableCell className="font-medium">{r.role}</TableCell>
                  <TableCell>{r.permissions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}


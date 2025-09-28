"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";

export default function RolesPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Roles</h1>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-default-600">Roles are fixed for now and apply per Workspace.</p>
          <div className="flex flex-col gap-2">
            <div>
              <Chip color="primary" variant="flat" className="mr-2">ADMIN</Chip>
              <span className="text-sm text-default-600">Full permissions, can manage members and settings.</span>
            </div>
            <div>
              <Chip color="secondary" variant="flat" className="mr-2">MEMBER</Chip>
              <span className="text-sm text-default-600">Create/update/move tasks; read boards/columns.</span>
            </div>
            <div>
              <Chip color="default" variant="flat" className="mr-2">VIEWER</Chip>
              <span className="text-sm text-default-600">Read-only.</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}


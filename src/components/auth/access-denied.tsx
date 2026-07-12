"use client";

import Link from "next/link";
import { ArrowRight, ShieldX } from "lucide-react";
import type { UserRole } from "@/domain";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { appHomeForRole } from "@/lib/auth/route-access";

export function AccessDenied({ role }: { role: UserRole }) {
  return (
    <div className="grid min-h-[calc(100vh-10rem)] place-items-center py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <span className="mb-2 grid size-10 place-items-center rounded-lg bg-destructive/10 text-destructive">
            <ShieldX className="size-5" aria-hidden="true" />
          </span>
          <CardTitle>この画面へのアクセス権限がありません</CardTitle>
          <CardDescription>
            現在のロールではこの機能を表示できません。必要な場合は組織管理者へ権限を確認してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={appHomeForRole(role)}>
              このロールのホームへ
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

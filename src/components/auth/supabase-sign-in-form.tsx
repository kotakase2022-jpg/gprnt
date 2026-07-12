"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readTrustedAppRole } from "@/lib/auth/roles";
import { appHomeForRole } from "@/lib/auth/route-access";
import { getLazySupabaseClient } from "@/lib/supabase/client";

const signInSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "メールアドレスを入力してください。")
      .email("有効なメールアドレスを入力してください。")
      .max(254),
    password: z.string().min(1, "パスワードを入力してください。").max(1024),
  })
  .strict();

type SignInInput = z.infer<typeof signInSchema>;

const GENERIC_SIGN_IN_ERROR =
  "ログインできませんでした。入力内容を確認して、もう一度お試しください。";

export function SupabaseSignInForm() {
  const router = useRouter();
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = form.handleSubmit(async (input) => {
    form.clearErrors("root");
    try {
      const client = getLazySupabaseClient();
      const { data, error } = await client.auth.signInWithPassword(input);
      const trustedRole = error
        ? null
        : readTrustedAppRole(data.user?.app_metadata);

      if (error || !data.session || !data.user || !trustedRole) {
        if (data.session) await client.auth.signOut({ scope: "local" });
        form.setError("root", {
          type: "server",
          message: GENERIC_SIGN_IN_ERROR,
        });
        return;
      }

      router.replace(appHomeForRole(trustedRole));
    } catch {
      form.setError("root", {
        type: "server",
        message: GENERIC_SIGN_IN_ERROR,
      });
    }
  });

  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;
  const rootError = form.formState.errors.root?.message;

  return (
    <Card className="max-w-md">
      <CardHeader>
        <span className="mb-2 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <LockKeyhole className="size-5" aria-hidden="true" />
        </span>
        <CardTitle>Supabase Authでログイン</CardTitle>
        <CardDescription>
          管理者から発行されたメールアドレスとパスワードを入力してください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" noValidate onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "email-error" : undefined}
              disabled={form.formState.isSubmitting}
              {...form.register("email")}
            />
            {emailError && (
              <p id="email-error" className="text-xs text-destructive">
                {emailError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(passwordError)}
              aria-describedby={passwordError ? "password-error" : undefined}
              disabled={form.formState.isSubmitting}
              {...form.register("password")}
            />
            {passwordError && (
              <p id="password-error" className="text-xs text-destructive">
                {passwordError}
              </p>
            )}
          </div>

          {rootError && (
            <Alert variant="destructive" aria-live="polite">
              <AlertDescription>{rootError}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            <LogIn className="size-4" aria-hidden="true" />
            {form.formState.isSubmitting ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

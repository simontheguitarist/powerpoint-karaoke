import Link from "next/link";
import { SignInForm } from "@/components/SignInForm";
import { GoogleButton } from "@/components/GoogleButton";
import { googleConfigured } from "@/lib/auth";

export const metadata = { title: "Sign in · PowerPoint Karaoke" };

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <div className="card p-8">
        <h1 className="display text-4xl">Welcome back.</h1>
        <p className="text-mute mt-2 text-sm">
          Sign in to upload decks or generate one with AI.
        </p>
        {googleConfigured && (
          <>
            <div className="mt-8">
              <GoogleButton callbackURL="/studio" />
            </div>
            <Divider />
          </>
        )}
        <div className={googleConfigured ? "" : "mt-8"}>
          <SignInForm />
        </div>
        <div className="mt-6 text-sm text-mute">
          No account yet?{" "}
          <Link href="/sign-up" className="underline underline-offset-4">
            Create one
          </Link>
          .
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-6 text-xs uppercase tracking-widest text-mute">
      <span className="flex-1 h-px bg-line" />
      or
      <span className="flex-1 h-px bg-line" />
    </div>
  );
}

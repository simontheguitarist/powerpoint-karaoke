import Link from "next/link";
import { SignUpForm } from "@/components/SignUpForm";
import { GoogleButton } from "@/components/GoogleButton";
import { googleConfigured } from "@/lib/auth";

export const metadata = { title: "Sign up · PowerPoint Karaoke" };

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <div className="card p-8">
        <h1 className="display text-4xl">Make an account.</h1>
        <p className="text-mute mt-2 text-sm">
          You only need this to upload decks or generate one with AI. Joining a
          game is always free.
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
          <SignUpForm />
        </div>
        <div className="mt-6 text-sm text-mute">
          Already have one?{" "}
          <Link href="/sign-in" className="underline underline-offset-4">
            Sign in
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

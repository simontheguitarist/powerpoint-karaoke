import { getUserOrRedirect } from "@/lib/session";
import { UploadForm } from "@/components/UploadForm";

export const metadata = { title: "Upload · Studio" };

export default async function UploadPage() {
  await getUserOrRedirect();
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="pill">Upload</div>
      <h1 className="display text-6xl mt-3">Bring your own slides.</h1>
      <p className="text-mute mt-3 max-w-lg">
        Drop in a PowerPoint, PDF, or a stack of images. We&apos;ll convert
        them to clean slide images and add the deck to your library.
      </p>
      <div className="mt-10">
        <UploadForm />
      </div>
    </div>
  );
}

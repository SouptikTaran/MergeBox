import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Frame, FrameHeader, FrameTitle, FramePanel } from "@/components/reui/frame";
import { Badge } from "@/components/reui/badge";
import { SignInButton } from "@/features/auth/sign-in-button";

export const metadata: Metadata = { title: "Getting started" };
export default function Page() {
  return (
    <>
      <PageHeader
        title="A little guidance"
        description="Get to know your new workspace."
      />
      <div className="flex max-w-3xl flex-col gap-4">
        <Frame spacing="default">
          <FrameHeader>
            <FrameTitle>01 / Make yourself at home</FrameTitle>
          </FrameHeader>
          <FramePanel>
            <div className="flex flex-col items-start gap-4">
              <p className="text-sm text-muted-foreground">
                See storage across your connected accounts and browse their files. Use
                Settings to switch themes or sign out.
              </p>
              <Badge variant="outline">Connected workspace</Badge>
            </div>
          </FramePanel>
        </Frame>
        <Frame spacing="default">
          <FrameHeader>
            <FrameTitle>02 / Sign in securely</FrameTitle>
          </FrameHeader>
          <FramePanel>
            <div className="flex flex-col items-start gap-4">
              <p className="text-sm text-muted-foreground">
                Google sign-in creates your DrivePool identity. It does not read your
                files or connect your Drive. Your account details appear in Settings.
              </p>
              <SignInButton />
            </div>
          </FramePanel>
        </Frame>
        <Frame spacing="default">
          <FrameHeader>
            <FrameTitle>03 / Bring your drives together</FrameTitle>
          </FrameHeader>
          <FramePanel>
            <div className="flex flex-col items-start gap-4">
              <p className="text-sm text-muted-foreground">
                Use Connect drive to grant Google Drive metadata access with separate
                consent, see combined storage, and open files in their original Drive.
                Uploads and transfers will follow later.
              </p>
              <Badge variant="primary-light">Read-only Drive access</Badge>
            </div>
          </FramePanel>
        </Frame>
      </div>
    </>
  );
}

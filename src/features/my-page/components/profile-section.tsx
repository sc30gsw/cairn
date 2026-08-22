import { Avatar, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconCamera } from "@tabler/icons-react";
import { Result } from "better-result";
import { useRef, useState } from "react";

import { userLabel } from "~/features/auth/components/auth-account-menu";
import { AvatarCropModal } from "~/features/my-page/components/avatar-crop-modal";
import { useAvatarUploadDeps } from "~/features/my-page/hooks/use-avatar-upload-deps";
import { avatarUploadErrorMessage, uploadAvatarBlob } from "~/features/my-page/lib/avatar-upload";
import { updateProfileImage } from "~/features/my-page/lib/profile-actions";
import type { AppShellUser } from "~/types/session";

type ProfileSectionProps = {
  user: AppShellUser;
};

export function ProfileSection({ user }: ProfileSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDeps = useAvatarUploadDeps();
  const [previewSrc, setPreviewSrc] = useState<null | string>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<null | string>(null);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewSrc(reader.result);
        setCropOpen(true);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleConfirm(blob: Blob) {
    setErrorMessage(null);
    const uploadResult = await uploadAvatarBlob(blob, uploadDeps);
    if (Result.isError(uploadResult)) {
      setErrorMessage(avatarUploadErrorMessage(uploadResult.error));
      return;
    }
    const updateResult = await updateProfileImage(uploadResult.value);
    if (updateResult.errorMessage !== null) {
      setErrorMessage(updateResult.errorMessage);
    }
  }

  return (
    <Card padding="md">
      <Stack gap="md">
        <Title order={3}>プロフィール</Title>
        <Group gap="md" wrap="nowrap">
          <Avatar alt={userLabel(user)} radius="xl" size={128} src={user.image ?? undefined}>
            {userLabel(user).slice(0, 1)}
          </Avatar>
          <Stack gap="xs">
            <Text fw={600}>{user.name}</Text>
            {user.username ? <Text c="dimmed">@{user.username}</Text> : null}
            <Button
              leftSection={<IconCamera aria-hidden size={16} />}
              onClick={openFilePicker}
              size="xs"
              type="button"
              variant="light"
            >
              アイコンを変更
            </Button>
            <Text c="dimmed" size="xs">
              JPEG / PNG、正方形 256×256 以内
            </Text>
          </Stack>
        </Group>
        {errorMessage ? (
          <Text c="red" size="sm">
            {errorMessage}
          </Text>
        ) : null}
        <input
          accept="image/jpeg,image/png"
          hidden
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        {previewSrc ? (
          <AvatarCropModal
            imageSrc={previewSrc}
            onClose={() => setCropOpen(false)}
            onConfirm={handleConfirm}
            opened={cropOpen}
          />
        ) : null}
      </Stack>
    </Card>
  );
}
